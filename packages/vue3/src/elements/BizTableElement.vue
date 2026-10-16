<template>
  <TableElement :element="element" :scale="scale" :static="static" biz @cell-update="$emit('cell-update', $event)" />
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { PptBizTableElement, PptTableCell } from '@vue-ppt-kit/core';
import TableElement from './TableElement.vue';

// 富表格（业务组件）：与表格组件同构（双击单元格编辑），单元格为业务文本（fx 业务字段混排）
defineProps({
  element: { type: Object as PropType<PptBizTableElement>, required: true },
  scale: { type: Number, default: 1 },
  /** 静态渲染（缩略图等）：不响应双击编辑 */
  static: { type: Boolean, default: false },
});

defineEmits<{
  (e: 'cell-update', data: PptTableCell[][]): void;
}>();
</script>
