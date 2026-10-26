# vue-ppt-kit 重构与修复计划

> 依据 2026-10-23 全包评审（core / theme / vue2 / vue3 + 工程配置）整理。
> 总体结论：架构健康（算法已下沉 core、注释质量高、事件监听成对解绑），
> 核心问题是 **双端 ~4700 行组件代码 95% 逐行同构、靠人工同步已产生真实漂移**。
> 建议按 P0 → P5 顺序执行，每阶段可独立交付验证。

---

## P0 真实 Bug 修复（✅ 已完成，2026-10-23）

### P0-1 vue2 缩略图空白区右键菜单打不开

- [x] `packages/vue2/src/SlideThumbnails.vue:2`
- 现象：根节点 `@contextmenu.prevent="openMenu(...)"` 缺 `.stop`，事件冒泡到 document 级
  `onGlobalContextMenu`（无条件 `closeMenu()`），菜单同 tick 开了又被关。
- 修法：改为 `@contextmenu.prevent.stop="openMenu($event, 'blank')"`，与 vue3 端对齐
  （参考 `packages/vue3/src/SlideThumbnails.vue:2`）。
- 回归：缩略图面板空白处右键应弹出「新建页面」类菜单；页面条目上右键菜单不受影响。

### P0-2 表格 colspan/rowspan 「半支持」导致布局错乱

- [x] `packages/core/src/index.ts`（PptTableCell 类型）、`packages/{vue2,vue3}/src/elements/TableElement.vue`
- 现象：类型有 `colspan/rowspan` 可选字段，但渲染层无条件输出每个 `<td>`，
  没有跳过被覆盖单元格的逻辑；数据一旦带合并（如后端模板导入），`table-layout: fixed` 下布局错乱。
- 决策结果：按 A 实施。✅ core 新增 `table.ts` 的 `computeCoveredCells(data): Set<string>`（"r:c" 键，
  0/负数按未合并处理，含 8 个单测），两端 TableElement 以 `<template v-for>` + `v-if` 跳过被覆盖格。
- [x] `packages/core/src/table.ts` + 两端 `TableElement.vue` + `core/tests/table.test.ts`
- 回归：含 `colspan:2` 的 mock 数据渲染后每行总列数恒等于列数。

### P0-3 vue3 PptEditor 的 provide 是一次性快照（异步 props 丢失）

- [x] `packages/vue3/src/PptEditor.vue:133-134`
- 现象：`provide(KEY, props.bizVariables ?? [])` 一次性快照；父组件异步加载变量树后
  替换 props 引用时，inject 方（BizTextElement / MediaElement）永远拿旧值/空数组。
- 修法：对齐 vue2 端实现（`packages/vue2/src/PptStage.vue:127-144`）：
  `reactive` 副本 + `watch(() => props.bizVariables)` 同步后 provide。✅ 已完成。
- 回归：playground vue3-app 中异步 1s 后再赋值 `bizVariables`，fx 级联能选出新节点。

### P0-4 GuidesLayer document 回退分支的监听泄漏

- [x] `packages/{vue2,vue3}/src/GuidesLayer.vue`
- 现象：pointer capture 失败走 document 回退分支时，若拖动中组件被 `v-if` 卸载，
  document 上的 `pointermove/pointerup/pointercancel` 永久残留（闭包持有 emit）。
- 修法：把 document 回退监听记录到实例级变量，补 `onUnmounted` / `beforeDestroy`
  中按需移除（capture 成功路径不受影响）。✅ 已完成（两端）。

---

## P1 双端重复收敛（重构主轴）

背景：`useSlides` / `useCanvasScale` / `emitter` / Toolbar / SlideCanvas 等全部逐行同构，
代码注释「修改时请双端同步」已证明失效——P0 的 4 个 bug 全是双端不同步的产物。

**结论：组件级单源可行，不必分端维护。** 已核实两端组件内部零 Element UI / Element Plus
依赖（全部原生元素 + 自绘弹层），唯一的版本敏感点是 reactivity API 与 3 处 Teleport /
vuedraggable。**已选定模型 B（共享源码 + 按端编译）**，见 P1-1。

### P1-1 双端编译模型：已选定 B（共享源码 + 按端编译）✅ 已落地

落地记录（2026-10-23）：`packages/shared/src/`（useSlides / useCanvasScale / emitter）；
reactivity 统一经 `'@vpk/vue-api'` 导入（vue2 → vite alias 到 `src/compat.ts`（新增 `set/del`），
vue3 → `src/vue-api.ts` re-export 'vue'）；两端 vite alias `'@vpk/shared' → ../shared/src` +
tsconfig paths；根 package.json 增加 `@tthappy/ppt-core` devDep（shared 目录内 TS 解析用）。
两端原文件改为单行 shim 转发，既有导入路径零改动。三包构建 + 78 单测 + vue-tsc 全绿。

- [x] 新建 `packages/shared/src/`（不构建、不发包），vue2/vue3 共享源码（TS + SFC）放这里；
  两端 vite 构建各自把它编进自己的 bundle，对外仍是 `@tthappy/ppt-vue2` / `@tthappy/ppt-vue3`
  两个发布包（发布面不变，宿主升级无感）。
- [x] 统一 import 面：共享源码一律经 `'@vpk/vue-api'` 导入 reactivity；
  vue3 端新建 `src/vue-api.ts`（re-export 'vue' + set/del 普通实现），vue2 端 compat.ts 增补
  `set/del`（Vue.set / Vue.delete）。
- [x] vue2 打包时把共享源码的 reactivity 重定向到 `src/compat`（alias，见 vite.config.ts）。
- 代价（接受）：产物双份（体积与现状相同）；shared 不发包，两端需同步发版。
- 备忘（已否决的备选）：模型 A（vue-demi）——一份 dist 服务双版本、vue2/vue3 可合并单包；
  代价是引入 postinstall 依赖（pnpm 9 需 `onlyBuiltDependencies` 放行）与运行时切换心智。

### P1-2 共享非组件 TS（✅ 已完成：useSlides / useCanvasScale / emitter）

- [x] `useSlides.ts`：双端合一（shared 单源）。vue2 特有的 `Vue.set/Vue.delete` 抽为
  `set/del`（经 `'@vpk/vue-api'` 按端落地），`copyElement/pasteElement` 的 `delete clone.textId`
  同步改 `del` 保证 vue2 响应式。
- [x] `useCanvasScale.ts`：合一（取 vue3 版结构 + 保留 vue2 的无 ResizeObserver 时
  window resize 兜底与 throttle）。
- [x] `emitter.ts`：inject key 统一字符串（`EDITOR_EMITTER` 自 core re-export）。
- 落地形态：`packages/shared/src/` 目录（见 P1-1），两端 vite alias 引入，原路径 shim 转发。
- 验收：✅ 双端实现文件删除（只剩 shared 一份）；`pnpm build` / 78 单测 / vue-tsc 全绿；
  playground 手动回归待做。

### P1-3 组件层共享（单源 SFC，可行）

共享组件写法约束（保证 Vue 2.6 / 2.7 / 3 三环境可编译运行）：

1. `<script>` 用 `defineComponent({ props, emits, setup() { ... return {...} } })`，
   **不用 `<script setup>`**（2.6 的 @vue/composition-api 不支持该语法糖；2.7/3 均支持普通 setup）；
2. 模板单根节点（2.x 强制）；不用 filter、不用 `$listeners`；
3. **不用 `<Teleport>`**（2.x 没有）：挂 body 的弹层统一用「手动 `document.body.appendChild`
   + 卸载摘除」模式——vue2 端 BizVarPicker 已是现成实现，vue3 端照搬即可；
4. 组件间 v-model 避免依赖两端事件名差异：统一 `props.value + emit('input')`，
   vue3 端经 `compat` 声明 `model: { prop: 'value', event: 'input' }`（2/3 通用写法）；
5. `vuedraggable`（2/4 API 不同）：模型 B 下不再是阻塞——SlideThumbnails 保留分端壳
   （vuedraggable 各用各的），排序 / 右键菜单逻辑抽入 shared；若想彻底单源，可选用原生
   HTML5 DnD 替代（约百行，列入 P5 可选项）。

组件分诊：

| 组件 | 共享方式 |
| --- | --- |
| Ruler / GuidesLayer / TextElement / BizTextElement / TableElement / BizTableElement / ImageElement / ShapeElement / MediaElement / RichEditor / BizVarPicker / ColorPopup / TablePicker / BgGalleryDialog | **直接单源**（模板双端几乎逐字相同，无版本敏感依赖） |
| PptStage ↔ PptEditor | 单源，仅入口文件名/export 名两端薄壳区分 |
| SlideThumbnails | 分端壳（vuedraggable 各用各的），排序/菜单逻辑入 shared；原生 DnD 替代后可单源 |
| Toolbar / SlideCanvas | 单源迁移放最后（体量最大，迁移前先做 P2 对齐与 P3 性能项，避免把漂移/问题带进单源） |

- [x] 迁移顺序：~~Ruler~~ → ~~GuidesLayer~~ → ~~ImageElement~~ / ~~ShapeElement~~ → ~~各 elements~~ → ~~弹层~~ → ~~PptStage/PptEditor~~
    → ~~Toolbar~~ → ~~SlideCanvas~~ → ~~SlideThumbnails（逻辑入 shared，壳分端）~~（由简到繁，每步独立可回归）。
    ✅ **第一批评测后完成**（2026-10-23）：Ruler / GuidesLayer / ImageElement / ShapeElement 移入 `shared/src/components/`
  （defineComponent + setup() 写法，compat 补 `defineComponent/onBeforeUnmount` 与 `PropType/Ref` 类型出口），
  两端改为单行 shim；三包构建 + vue-tsc 全绿，双端产物确认包含 shared 组件。
  ✅ **P1-3 剩余全部完成**（2026-10-26）：TextElement / BizTextElement / TableElement / BizTableElement /
  MediaElement / RichEditor / BizVarPicker / ColorPopup / TablePicker / BgGalleryDialog / Toolbar / SlideCanvas /
  PptEditor（vue2 端 PptStage 单行 shim 别名）全部移入 `shared/src/components/`（`elements/`、`toolbar/` 子目录镜像原结构）。
  要点：
  - compat 增补 `nextTick` 出口与 `Component` 类型；共享模板不写 TS 断言 / 可选链 / 内联 ref 赋值，统一走 setup 方法；
  - BizVarPicker 按 P1-3 约束 3 双端统一为「手动 `document.body.appendChild` + 卸载摘除」（vue3 端去 Teleport）；
  - 新增单源 `ContextMenu.vue`（自挂 body、二级菜单、全局关闭监听、自带 scoped 样式），
    PptEditor 元素菜单与两端 SlideThumbnails 菜单共用；配套 `shared/src/contextMenu.ts`
    （`MenuItem` 类型 + `useSlideContextMenu` 状态/菜单项推导）；
  - SlideThumbnails 保留两端壳（仅 vuedraggable 差异 + 缩略图 UI），新增端别名 `@vpk/shells`
    （各端 `src/shells.ts` 出口，vite alias + tsconfig paths），单源 PptEditor 经它引用本端壳；
  - `useToolbarPopups` composable 单源四套弹层状态机（见下）；双端产物均确认包含 shared 组件。
  - 顺带修复双端原有悬空缺陷：快捷键 Delete/Backspace 删除元素后右键菜单未关闭
    （单源 PptEditor 增加「菜单目标元素已不存在即关闭」watch，切换页面时同样生效）。
  - shim 清理（2026-10-26）：迁移期「单行 shim 保路径」的过渡文件在完成后已全部删除（双端共 41 个，
    含各 elements/ toolbar/ 与 PptStage/PptEditor/SlideCanvas/Toolbar/Ruler/GuidesLayer/emitter/useCanvasScale），
    两端 index.ts 入口与缩略图壳直接从 `@vpk/shared/components/*` 引入；
    每端 src 仅保留 6 个必要文件：index.ts（入口）、SlideThumbnails.vue（分端真壳）、
    useSlides.ts（公共导出路径）、compat.ts / vue-api.ts（reactivity 出口，alias 目标）、
    shells.ts（@vpk/shells alias 目标）与类型垫片。
  - compat.ts 改名（2026-10-26）：vue2 端 reactivity 出口 `src/compat.ts` → `src/vue-api.ts`，
    与 vue3 端同名对称（vite alias / tsconfig paths / 注释已同步）；shared 目录另有独立
    tsconfig（`@vpk/vue-api` / `@vpk/shells` 指到 vue3 端文件 + `*.vue` 垫片）供 IDE / 裸 tsc 解析。
  验证：`pnpm build` / core 78 单测 / vue-tsc 全绿；vue2-app（vue-cli/webpack）/ vue3-app（vite）playground 构建通过；
  playground 手动交互回归待做。
- [x] Toolbar 四套弹层状态机（table/bizTable/slideType/color 的 toggle/close/anchor）
  抽成 `useToolbarPopups` composable 下沉 shared（`shared/src/useToolbarPopups.ts`，双端 ×8 份重复 → 1 份）。
  ✅ 已完成（2026-10-26）；顺带把弹层宽度 170/196/224 收口为单一常量源 `TOOLBAR_POPUP_WIDTH`（P5 项同步勾掉）。

### P1-4 包结构：保持两个发布包 + 新增共享源码目录

模型 B 下不合并发布包（对外发布面不变），结构调整为「2 发布包 + 1 共享源码目录」：

- [ ] `packages/shared/`：仅源码（TS + SFC），无 package.json 构建、不发布；
  两端以相对路径 / vite alias 引入，随各自 bundle 编译发布。
- [x] 两端保留对外入口差异：vue2 导出 `PptStage`、vue3 导出 `PptEditor`
  （✅ 共享实现同名 `PptEditor.vue`，vue2 端入口单行 shim re-export 别名，命名逐步归一）。
- [ ] `theme` 包折叠：内容仅 7 行 CSS（其中 `.vpk-stage` 为死样式，见 P4），
  并入两端 `style.css` 产物后删除该包（CSS 变量用法写进 README）。
- [ ] `core` 保留独立发布包：框架无关、Node/单测可直连，不应被拖入 vue 依赖。
- [ ] 双端各自 playground 回归不变（按端编译天然各测各的，无跨版本切换问题）。

---

## P2 行为漂移对齐（收敛前先统一语义）

- [x] `||` → `??` 清理（✅ 两端 TextElement / BizTextElement / ImageElement / TableElement /
  Toolbar；`fill`、`fontFamily` 保留 `||` —— 空串→透明/inherit 的语义是故意的）。
- [x] 右键菜单裁剪：✅ 已完成（2026-10-26，随 P1-3 单源 ContextMenu 落地）。
  双端统一为「手动 `document.body.appendChild` + 卸载摘除」模式（`shared/src/components/ContextMenu.vue`，
  vue3 端去 Teleport），顺带解决 vue2 端边缘元素右键菜单被 `overflow:hidden` 裁剪的问题；
  元素菜单与缩略图菜单（含二级菜单）均由该单源组件渲染，`.vpk-contextmenu` 样式收进组件 scoped 块。
- [x] 主题变量：vue2 端对齐 vue3 的 4 处差异（✅ PptStage 背景/边框、SlideCanvas 吸附线渐变
  接入 `var(--vpk-*)` 兜底写法；hover 态两端同为硬编码，保持一致）。
- [ ] `onBgConfirm` z 序语义确认：多选背景「先插再垫底」最终 z 序为选择顺序倒序，
  与注释「按选择顺序插入为底层」疑似相悖——与产品确认后统一两端实现与注释。（待产品确认）
- [x] `updatePosition` 用 core `MIN_SIZE` 替换魔法数字 `20`（✅ 两端）。
  **执行决策**：不加 x/y 与宽高上限——拖拽 / 缩放路径均允许元素部分出画布（PPT 合法状态），
  工具栏输入保持同一语义，避免「拖得出但输不进」的不一致。

---

## P3 性能优化（✅ 已完成，2026-10-23）

- [x] 拖拽/缩放 mousemove 加 rAF 合帧（✅ 两端 SlideCanvas）：只保留最新事件，
  每帧最多应用一次；mouseup 收尾 flush 最终事件保证落定位置精确。
- [x] vue2 端 `dragContext/resizeContext` 移出 `data()`（✅ 挂实例非响应式 `_rt`），
  对齐 vue3 的普通变量做法；`alignLineViews` 无命中帧复用 `EMPTY_ALIGN_LINES` 常量（✅ 两端）。
- [x] `onElementMouseDown/onResizeStart` 补 `e.button !== 0` 过滤（✅ 两端；
  与 GuidesLayer 统一）。
- [x] 拖出窗口 mouseup 丢失兜底（✅ 两端）。**执行决策**：以 `document mouseleave +
  window blur` 兜底结束拖拽替代 pointer capture 迁移——后者需把元素/画布/文本组件
  全套 mousedown 改 pointerdown（兼容性 mousedown 冒泡会误触 select(null)），风险大；
  mouseleave 方案行为等效（拖出窗口即结束拖拽，元素不再粘滞）。

---

## P4 工程与打包

- [ ] **vue2 补类型检查入口**：根 `typecheck` 脚本加入 vue2（`tsc --noEmit`）；
  手写 `packages/vue2/types/index.d.ts` 补全公共 API（目前仅导出 2 个符号，
  `elementComponentMap`、各元素组件、文档模型类型全缺）。
  ——此项与 P0-1 这类漂移 bug 直接相关，优先级高于其余工程项。
- [ ] 依赖声明整理（vue2 端为主，模型 B 下两端声明各自独立）：
  - vue2：`@vue/composition-api` 被静态 import 打进产物 → 从 devDependencies 移到 dependencies；
    `@tthappy/ppt-core` / `vuedraggable` 已内联进产物、运行时用不到 → 移到 devDependencies
    （保持「webpack4 宿主零配置内联」策略，README 注明）；
  - vue3：现状自洽（core/vuedraggable 在 dependencies 且构建外置），不动。
- [ ] tsconfig 收敛：根 `tsconfig.json` 作为 base，四包 `extends`；
  vue2 从 `es2018+node` 对齐到 `ES2020+Bundler`（tsconfig 仅影响类型检查，
  产物 target 由 vite/esbuild 控制，不影响旧宿主兼容）。
  （现状：shared 目录已有独立 tsconfig（2026-10-26，仅服务 IDE/裸 tsc 的模块解析——
  `@vpk/vue-api` / `@vpk/shells` 指到 vue3 端文件 + `*.vue` 垫片），根 base 收敛仍待做。）
- [ ] 引入 changesets（或约定简单版本脚本）：当前四包版本已漂移
  （core 0.1.1 / theme 0.1.1 / vue2 0.3.1 / vue3 0.1.2）且无发布流程。
- [ ] theme 包治理：
  - 删除全仓零消费的 `.vpk-stage` 规则与 `--vpk-text` 变量，或把 vue2 根节点类名
    落地为 `vpk-stage` 使其生效（二选一）；
  - RichEditor 两端各 ~135 行**非 scoped 全局** `.ProseMirror` 样式（会污染宿主页面
    同 class 实例）下沉 theme 包（或并入两端 `style.css` 产物），组件内删重复。
- [ ] vue2 补 `"type": "module"` 元数据（exports.import 指向 ESM 产物）。

---

## P5 小清理（部分完成，2026-10-23）

- [x] 删除 vue2 `Toolbar.vue` 三个死代码 computed：`fontFamilyValue` / `fontSizeValue` / `fillColor`。
- [x] 删除两端 TextElement 模板死引用 `ref="container"` / `ref="containerRef"`。
- [x] 魔法数字收口到 core：`DEFAULT_FONT_SIZE` / `DEFAULT_TEXT_COLOR` / `DEFAULT_LINE_HEIGHT`
  （presets.ts，替换 TextElement / BizTextElement / Toolbar / factory 共 10 余处）；
  `SORPTION_RANGE` 拆分出 `MISOP_RANGE`（误操作判定，✅ 两端 SlideCanvas）；
  `updatePosition` 的 `20` → `MIN_SIZE`。
- [x] `createTableElement` 参数顺序统一为 `(doc, row, col)`（与 `createBizTableElement` 一致；
  破坏性变更，随版本说明）——同步两端 TablePicker 调用点与 factory 单测。
- [x] 修正两端入口头注释中误导性的「（Element UI）/（Element Plus）」标注。
- [x] 弹层宽度 170/196/224/212 JS 与 CSS 双份维护 → 单一常量源
  （✅ 2026-10-26：`useToolbarPopups.ts` 的 `TOOLBAR_POPUP_WIDTH` 收口 slideType/color/table 三处
  JS 调用点；212 为 ColorPopup 自身 CSS 盒宽，仅一处使用，留在组件内）。
- [ ] z-index 层级表（2400/1000/40/30 → `Z_INDEX` 枚举）（未做）。
- [ ] BgGalleryDialog：`:key="i"` 改业务 key；`selectedBgs` dataURL 去重（可放缓）。
- [ ] Toolbar `onOutsideClick` 的硬编码类名探测改为 ref/`data-*` 标记（可选）。
- [ ] （可选，P1-3 约束 5 的彻底单源方案）自写原生 HTML5 DnD 替代 vuedraggable。

---

## 验证清单（每阶段完成后跑）

```bash
pnpm build        # core → vue2 → vue3 顺序构建通过
pnpm typecheck    # P4 完成后应覆盖四包
pnpm test         # core 既有 6 个测试文件 + P0-2 新增用例
```

playground 手动回归（vue2-app 与 vue3-app 各跑一遍）：

- [ ] 插入文本/图片/表格/富表格/媒体/业务文本，拖拽 + 吸附线 + 8 向缩放（Shift 锁比）
- [ ] 富文本：加粗/斜体/下划线/删除线/颜色/字体/字号/清除，编辑态工具栏回显正确
- [ ] 业务文本 fx 级联选变量、媒体组件级联选照片 + 关联文本拖动跟随/右键隐藏
- [ ] 缩略图：新建（3 种类型）/复制/删除/拖拽排序/条目右键/**空白处右键（P0-1 回归点）**
- [ ] 快捷键：Cmd+C/V/D、Delete、方向键微移（Shift ×10）、Escape 两段退出
- [ ] 标尺显隐、参考线拖动、Ctrl+滚轮缩放、空格拖画布、Cmd+0 复位
- [ ] 表格：双击编辑、Tab 换格、document 点击退出；含 colspan mock 数据渲染（P0-2 回归点）
- [ ] vue3-app 异步 bizVariables 场景（P0-3 回归点）

## 暂缓 / 明确不做

- vuedraggable 跨大版本统一（模型 B 下保留 SlideThumbnails 分端壳；
  可选以原生 DnD 替代后单源，见 P5）
- 引入 lodash（现有手写 throttle/deepClone 足够）
- `parsePptx` 占位实现（core 有意留空）
- ~~双端组件分端维护~~：已确认组件级单源可行（vue-demi 模式 / 按端编译，见 P1-3），
  仅 SlideThumbnails 因 vuedraggable 保留分端壳
