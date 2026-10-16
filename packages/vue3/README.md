# @tthappy/ppt-vue3

面向 **Vue 3** 的 PPT 编辑器组件（`PptEditor`）：顶部工具栏 + 左侧幻灯片缩略图（拖拽排序）+ 画布编辑区，支持文本（富文本）、业务文本（业务字段 tag 混排）、图片、形状、表格、媒体组件等元素类型。

核心逻辑沉淀在框架无关的 [@tthappy/ppt-core](https://www.npmjs.com/package/@tthappy/ppt-core) 中，[Vue 2 版本](https://www.npmjs.com/package/@tthappy/ppt-vue2)提供完全一致的数据模型与交互。

## 安装

```bash
npm install @tthappy/ppt-vue3 @tthappy/ppt-core
```

要求 `vue >= 3.3`。

## 快速开始

```vue
<template>
  <PptEditor :document="doc" :biz-variables="bizVariables" :media-options="mediaOptions" @save="onSave" />
</template>

<script setup lang="ts">
import { PptEditor } from '@tthappy/ppt-vue3';
import type { PptBizVariableNode, PptDocumentModel } from '@tthappy/ppt-core';
import '@tthappy/ppt-theme';

const doc: PptDocumentModel = {
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
};

const bizVariables: PptBizVariableNode[] = [];
const mediaOptions = [];

function onSave(doc: PptDocumentModel) { /* 持久化 doc */ }
</script>
```

## Props

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `document` | `PptDocumentModel` | 文档模型（必填），纯 JSON 结构，编辑后经 `@save` 事件回交宿主持久化 |
| `biz-variables` | `PptBizVariableNode[]` | 业务文本组件（fx）可选择的业务变量树 |
| `media-options` | 级联选项树 | 媒体组件的照片级联选项 |

## 样式

组件样式已随包分发，引入主题即可（CSS 变量换肤见 [@tthappy/ppt-theme](https://www.npmjs.com/package/@tthappy/ppt-theme)）：

```ts
import '@tthappy/ppt-theme';
```

## 已知问题

- `0.1.0` 的 `dependencies` 误发布了 pnpm 的 `workspace:*` 协议，npm 下无法安装，**请使用 `>=0.1.1`**。

## 仓库

[github.com/tingke/vue-ppt](https://github.com/tingke/vue-ppt)
