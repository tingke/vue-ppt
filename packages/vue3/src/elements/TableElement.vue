<template>
  <div class="vpk-table" :style="tableStyle">
    <table class="vpk-table-inner">
      <colgroup>
        <col v-for="(w, i) in colWidths" :key="i" :style="{ width: w * 100 + '%' }" />
      </colgroup>
      <tbody>
        <tr v-for="(row, r) in element.data" :key="r">
          <td
            v-for="cell in row"
            :key="cell.id"
            :colspan="cell.colspan || 1"
            :rowspan="cell.rowspan || 1"
            :style="cellStyle(r)"
          >{{ cell.text }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { PptTableElement } from '@vue-ppt-kit/core';

// 参考 PPTist BaseTableElement：纯静态渲染表格元素
const props = defineProps({
  element: { type: Object as PropType<PptTableElement>, required: true },
  scale: { type: Number, default: 1 },
});

const colWidths = computed(() => {
  const colCount = props.element.data.length ? props.element.data[0].length : 0;
  if (props.element.colWidths && props.element.colWidths.length === colCount) {
    return props.element.colWidths;
  }
  return new Array(colCount).fill(1 / (colCount || 1));
});

const tableStyle = computed(() => ({
  borderColor: props.element.outlineColor || '#dcdcdc',
  color: props.element.color || '#606266',
}));

function cellStyle(row: number) {
  const el = props.element;
  const isHeader = row === 0 && el.headerFill;
  return {
    fontSize: (el.fontSize || 14) * props.scale + 'px',
    background: isHeader ? el.headerFill : undefined,
    color: isHeader ? el.headerColor || '#fff' : undefined,
  };
}
</script>

<style scoped>
.vpk-table {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid;
  box-sizing: border-box;
}
.vpk-table-inner {
  width: 100%;
  height: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.vpk-table-inner td {
  border: 1px solid;
  border-color: inherit;
  padding: 4px 8px;
  text-align: left;
  word-break: break-word;
  overflow: hidden;
}
</style>
