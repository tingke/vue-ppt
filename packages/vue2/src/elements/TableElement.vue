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
            :class="{ header: r === 0 }"
            :style="cellStyle(r)"
          >{{ cell.text }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { PptTableElement } from '@vue-ppt-kit/core';

// 参考 PPTist BaseTableElement：纯静态渲染表格元素
export default Vue.extend({
  name: 'PptTableElement',
  props: {
    element: { type: Object as () => PptTableElement, required: true },
    scale: { type: Number, default: 1 },
  },
  computed: {
    colWidths(): number[] {
      const data = this.element.data;
      const colCount = data.length ? data[0].length : 0;
      if (this.element.colWidths && this.element.colWidths.length === colCount) {
        return this.element.colWidths;
      }
      return new Array(colCount).fill(1 / (colCount || 1));
    },
    tableStyle(): Record<string, string> {
      const el = this.element;
      return {
        borderColor: el.outlineColor || '#dcdcdc',
        color: el.color || '#606266',
      };
    },
  },
  methods: {
    cellStyle(row: number): Record<string, string | undefined> {
      const el = this.element;
      const isHeader = row === 0 && el.headerFill;
      return {
        fontSize: (el.fontSize || 14) * this.scale + 'px',
        background: isHeader ? el.headerFill : undefined,
        color: isHeader ? el.headerColor || '#fff' : undefined,
      };
    },
  },
});
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
