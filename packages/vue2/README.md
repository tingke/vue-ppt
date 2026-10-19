# @tthappy/ppt-vue2

面向 **Vue 2.6 / 2.7** 的 PPT 编辑器组件：顶部工具栏 + 左侧幻灯片缩略图（拖拽排序）+ 画布编辑区，支持文本（富文本）、业务文本（业务字段 tag 混排）、图片、形状、表格、媒体组件等元素类型。

核心逻辑沉淀在框架无关的 [@tthappy/ppt-core](https://www.npmjs.com/package/@tthappy/ppt-core) 中，[Vue 3 版本](https://www.npmjs.com/package/@tthappy/ppt-vue3)提供完全一致的数据模型与交互。

## 安装

```bash
npm install @tthappy/ppt-vue2 @tthappy/ppt-core
# Vue 2.6 与 2.7 均零配置：组合式 API 的实现随包内置，运行时按宿主版本自适应
```

### Vue 2.6 / 2.7 双版本实现机制

组合式 API 统一从 `src/compat.ts` 导入，运行时按 `Vue.version` 选择实现：

| 宿主版本 | 实现 | 说明 |
| --- | --- | --- |
| Vue 2.7+ | 内置 Composition API（`Vue.ref` 等） | 走原生 setup 路径 |
| Vue 2.6 | 随包内置的 `@vue/composition-api` | 加载时自动 `Vue.use` 注册，宿主无需安装 |

**关键约束**：Vue 2.7 下绝不注册该插件——它面向 Vue 2.6，靠全局 mixin 把 `setup()` 挂进 `data()` 延迟调用；而 2.7 原生也会调用 `setup()`，两者叠加会导致 setup 双重执行且互缺上下文（provide 警告、watch 崩溃、setup 返回值丢失，编辑器渲染失败）。宿主项目自行安装/注册 `@vue/composition-api` 不受影响（插件有防重复安装保护，且 2.7 宿主上本包不会用到它）。

## 快速开始

```vue
<template>
  <PptStage :document="doc" :biz-variables="bizVariables" :media-options="mediaOptions" @save="onSave" />
</template>

<script>
import { PptStage } from '@tthappy/ppt-vue2';
import '@tthappy/ppt-theme';

export default {
  components: { PptStage },
  data() {
    return {
      doc: {
        width: 960,
        height: 540,
        slides: [
          {
            id: 's1',
            elements: [
              { id: 'e1', type: 'text', x: 60, y: 60, width: 600, height: 80, text: '标题', fontSize: 36 },
            ],
          },
        ],
      },
      bizVariables: [],
      mediaOptions: [],
    };
  },
  methods: {
    onSave(doc) { /* 持久化 doc */ },
  },
};
</script>
```

## Props

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `document` | `PptDocumentModel` | 文档模型（必填），纯 JSON 结构，编辑后经 `@save` 事件回交宿主持久化 |
| `biz-variables` | `PptBizVariableNode[]` | 业务文本组件（fx）可选择的业务变量树 |
| `media-options` | 级联选项树 | 媒体组件的照片级联选项 |

## 已知问题

- `0.1.0` 的 `dependencies` 误发布了 pnpm 的 `workspace:*` 协议，npm 下无法安装，**请使用 `>=0.1.1`**。

## 仓库

[github.com/tingke/vue-ppt](https://github.com/tingke/vue-ppt)
