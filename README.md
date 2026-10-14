# vue-ppt-kit

Vue 2.6 / Vue 3 双版本 PPT 预览组件库基础骨架。

## 设计约定

- `@vue-ppt-kit/core`：纯 TypeScript 文档模型与 PPT 处理逻辑，不依赖 Vue 或 UI 框架。
- `@vue-ppt-kit/vue2`：面向 Vue 2.6，使用 `@vue/composition-api` 与 Element UI。
- `@vue-ppt-kit/vue3`：面向 Vue 3，使用 Element Plus。
- `@vue-ppt-kit/theme`：共享 CSS 变量与基础样式。
- 两个 Playground 使用独立依赖树：Vue 2.6 使用 Vue CLI/Webpack，Vue 3 使用 Vite。

> Element UI 官方只支持 Vue 2。Vue 3 版本使用 Element Plus，不能把 Element UI 直接用于 Vue 3。

## 环境

建议 Node.js 18+、pnpm 9。

```bash
pnpm install
pnpm dev:vue2
# 另开终端
pnpm dev:vue3
```

## 当前范围

当前是可扩展的基础工程，不是完整 PPTX 渲染器。`core` 暂时提供文档模型和解析接口占位；后续应逐步实现 ZIP/OOXML 解析、媒体关系、形状与文本布局、动画支持及视觉回归测试。

## Vue 2.6 注意事项

- 通过 `@vue/composition-api` 提供 Composition API。
- Vue SFC 使用 `vue-template-compiler@2.6.14`，必须与 `vue` 版本严格一致。
- Vue 2 包使用独立构建链，避免 Vue 3 编译器产物混入。
