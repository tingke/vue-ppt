# @tthappy/ppt-core

框架无关的 PPT 编辑器核心包（TypeScript），[vue-ppt](https://github.com/tingke/vue-ppt) 的底层依赖：

- **文档模型**：`PptDocumentModel` / `PptSlideModel` / `PptElementModel` 及各元素类型定义（纯 JSON 结构）
- **富文本**：ProseMirror 编辑内核（`richeditor/`）、白名单过滤与业务字段 tag 工具
- **画布算法**：拖拽吸附 / 手柄缩放几何计算（`geometry`）、标尺刻度换算（`ruler`）
- **编辑器基建**：元素工厂（`factory`）、事件转发器（`emitter`）、快捷键（`hotkeys`）、工具栏预设（`presets`）

本包不依赖 Vue 或任何 UI 框架，可在任意环境（含 Node）使用。通常无需直接安装——[`@tthappy/ppt-vue2`](https://www.npmjs.com/package/@tthappy/ppt-vue2) / [`@tthappy/ppt-vue3`](https://www.npmjs.com/package/@tthappy/ppt-vue3) 会自动带上它；直接使用其类型与算法时手动安装即可：

```bash
npm install @tthappy/ppt-core
```

双格式分发：ESM（`dist/index.js`）+ CJS（`dist/index.cjs`），含完整类型声明。

## 仓库

[github.com/tingke/vue-ppt](https://github.com/tingke/vue-ppt)
