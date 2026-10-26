<template>
  <!-- 富表格（业务组件）：与表格组件同构（双击单元格编辑），单元格为业务文本（fx 业务字段混排）
       （vue2 / vue3 双端共享，P1-3：普通 defineComponent + setup()） -->
  <TableElement :element="element" :scale="scale" :static="static" biz @cell-update="onCellUpdate" />
</template>

<script lang="ts">
import { defineComponent } from '@vpk/vue-api';
import type { PropType } from '@vpk/vue-api';
import type { PptBizTableElement, PptTableCell } from '@tthappy/ppt-core';
import TableElement from './TableElement.vue';

export default defineComponent({
  name: 'PptBizTableElement',
  components: { TableElement },
  props: {
    element: { type: Object as PropType<PptBizTableElement>, required: true },
    scale: { type: Number, default: 1 },
    /** 静态渲染（缩略图等）：不响应双击编辑 */
    static: { type: Boolean, default: false },
  },
  emits: ['cell-update'],
  setup(_, { emit }) {
    function onCellUpdate(data: PptTableCell[][]) {
      emit('cell-update', data);
    }
    return { onCellUpdate };
  },
});
</script>
