// 元素类型 → 组件映射：
// 按元素类型映射渲染组件，扩展新类型时新增组件并在映射表注册即可
import type { Component } from 'vue';
import TextElement from './TextElement.vue';
import BizTextElement from './BizTextElement.vue';
import MediaElement from './MediaElement.vue';
import ImageElement from './ImageElement.vue';
import ShapeElement from './ShapeElement.vue';
import TableElement from './TableElement.vue';
import BizTableElement from './BizTableElement.vue';

export const elementComponentMap: Record<string, Component> = {
  text: TextElement,
  bizText: BizTextElement,
  media: MediaElement,
  image: ImageElement,
  shape: ShapeElement,
  table: TableElement,
  bizTable: BizTableElement,
};
