# @tthappy/ppt-vue2

面向 **Vue 2.6 / 2.7** 的 PPT 编辑器组件：顶部工具栏 + 左侧幻灯片缩略图（拖拽排序）+ 画布编辑区，支持文本（富文本）、业务文本（业务字段 tag 混排）、图片、形状、表格、媒体组件等元素类型。

核心逻辑沉淀在框架无关的 [@tthappy/ppt-core](https://www.npmjs.com/package/@tthappy/ppt-core) 中，[Vue 3 版本](https://www.npmjs.com/package/@tthappy/ppt-vue3)提供完全一致的数据模型与交互。

## 安装

```bash
npm install @tthappy/ppt-vue2 @tthappy/ppt-core @vue/composition-api
# Vue 2.6 还需确保已安装 vue@2.6.14
```

### Vue 2.6 与 Vue 2.7 的差异

本包的组合式 API 从 `@vue/composition-api` 导入，两种版本都需要安装它：

| 宿主版本 | 说明 |
| --- | --- |
| Vue 2.6 | `@vue/composition-api` 作为插件运行，**本包入口已自动 `Vue.use` 注册**，无需额外代码 |
| Vue 2.7 | Vue 2.7 已内置 Composition API，`@vue/composition-api@1.7.4+` 会自动转发到内置实现，直接安装即可 |

### Vue 2.7 项目安装报 peer 冲突？

`@vue/composition-api` 自身声明的 peer 范围是 `vue >= 2.5 < 2.7`，与 Vue 2.7 宿主组合时 npm 会报 `ERESOLVE` 冲突（本包已将其声明为可选 peer，不会主动触发）。若你的项目里显式安装它，使用以下任一方式：

```bash
# npm：放宽 peer 检查
npm install @vue/composition-api --legacy-peer-deps

# 或使用 pnpm / yarn（对 peer 冲突更宽松）
pnpm add @vue/composition-api
```

在 Vue 2.7 下共存是安全的（运行时自动转发到内置实现）。

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
