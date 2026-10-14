// 参考 PPTist EditableElement 中的 elementTypeMap：
// 按元素类型映射渲染组件，扩展新类型时新增组件并在映射表注册即可
import { Component } from 'vue';
import TextElement from './TextElement.vue';
import ImageElement from './ImageElement.vue';
import ShapeElement from './ShapeElement.vue';
import TableElement from './TableElement.vue';

export const elementComponentMap: Record<string, Component> = {
  text: TextElement,
  image: ImageElement,
  shape: ShapeElement,
  table: TableElement,
};
