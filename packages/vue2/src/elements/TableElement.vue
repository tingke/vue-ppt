<template>
  <div ref="root" class="vpk-table" :style="tableStyle" @mousedown="onRootMouseDown">
    <table class="vpk-table-inner">
      <colgroup>
        <col v-for="(w, i) in colWidths" :key="i" :style="{ width: w * 100 + '%' }" />
      </colgroup>
      <tbody>
        <tr v-for="(row, r) in element.data" :key="r">
          <td
            v-for="(cell, c) in row"
            :key="cell.id"
            :colspan="cell.colspan || 1"
            :rowspan="cell.rowspan || 1"
            :class="{ editing: isEditingCell(r, c) }"
            :style="cellStyle(r)"
            @mousedown="onCellMouseDown(r, c, $event)"
            @dblclick="onCellDblClick(r, c)"
          >
            <!-- 双击编辑态：单元格内挂富文本编辑器（普通表格 → 文本组件；富表格 → 业务文本组件） -->
            <TextElement
              v-if="isEditingCell(r, c) && !biz"
              :element="cellTextElement(cell, r)"
              :scale="scale"
              editing
              @update="writeCellText(r, c, $event.text)"
              @commit="onCellEditorCommit(r, c, $event)"
            />
            <BizTextElement
              v-else-if="isEditingCell(r, c) && biz"
              :element="cellBizTextElement(cell, r)"
              :scale="scale"
              editing
              @update="writeCellText(r, c, $event.text)"
              @commit="onCellEditorCommit(r, c, $event)"
            />
            <!-- 静态内容：编辑器序列化为受限内联 HTML（富文本 / 业务字段 tag），白名单过滤后输出 -->
            <span v-else class="ProseMirror-static" v-html="sanitizeRichText(cell.text)"></span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { sanitizeRichText, PptBizTableElement, PptBizTextElement, PptTableCell, PptTableElement, PptTextElement } from '@vue-ppt-kit/core';
import TextElement from './TextElement.vue';
import BizTextElement from './BizTextElement.vue';

// 参考 PPTist BaseTableElement：双击单元格进入编辑（单元格内挂富文本编辑器，
// 失焦 / 卸载 flush / Escape 提交）。biz 为 true 时即富表格：单元格为业务文本（fx 业务字段混排）
export default Vue.extend({
  name: 'PptTableElement',
  components: { TextElement, BizTextElement },
  props: {
    element: { type: Object as () => PptTableElement | PptBizTableElement, required: true },
    scale: { type: Number, default: 1 },
    // 静态渲染（缩略图等）：不响应双击编辑
    static: { type: Boolean, default: false },
    // 富表格模式：单元格编辑器为业务文本组件（BizTextElement）
    biz: { type: Boolean, default: false },
  },
  data() {
    return {
      // 当前编辑中的单元格（null 为非编辑态）
      editingCell: null as { r: number; c: number } | null,
    };
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
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onDocMouseDown);
  },
  methods: {
    // vue2 模板无法直接访问导入绑定：白名单过滤挂 methods 供模板 v-html 使用
    sanitizeRichText,

    cellStyle(row: number): Record<string, string | undefined> {
      const el = this.element;
      const isHeader = row === 0 && el.headerFill;
      return {
        fontSize: (el.fontSize || 14) * this.scale + 'px',
        background: isHeader ? el.headerFill : undefined,
        color: isHeader ? el.headerColor || '#fff' : undefined,
      };
    },

    isEditingCell(r: number, c: number): boolean {
      return !!this.editingCell && this.editingCell.r === r && this.editingCell.c === c;
    },

    // 编辑器伪元素：id 取 cell.id（防富文本命令误投递），样式取表格级属性（表头行用表头色）
    cellBase(cell: PptTableCell, row: number) {
      const el = this.element;
      const isHeader = row === 0 && el.headerFill;
      return {
        id: cell.id,
        x: 0,
        y: 0,
        width: el.width,
        height: el.height,
        text: cell.text,
        fontSize: el.fontSize || 14,
        color: isHeader ? el.headerColor || '#fff' : el.color || '#606266',
        align: 'left' as const,
      };
    },
    cellTextElement(cell: PptTableCell, row: number): PptTextElement {
      return { ...this.cellBase(cell, row), type: 'text' };
    },
    cellBizTextElement(cell: PptTableCell, row: number): PptBizTextElement {
      return { ...this.cellBase(cell, row), type: 'bizText' };
    },

    // 编辑中点击其他单元格：切换单元格（编辑器卸载 flush 保证旧内容写回），且不启动拖拽
    onCellMouseDown(r: number, c: number, e: MouseEvent) {
      if (this.static || !this.editingCell) return;
      e.stopPropagation();
      if (!this.isEditingCell(r, c)) {
        this.editingCell = { r, c };
        this.$nextTick(this.focusCellEditor);
      }
    },

    // 单元格编辑中阻止 mousedown 冒泡（点边框等非单元格区域）：画布不拖拽、不切换选中
    onRootMouseDown(e: MouseEvent) {
      if (this.editingCell) e.stopPropagation();
    },

    onCellDblClick(r: number, c: number) {
      if (this.static) return;
      this.editingCell = { r, c };
      document.addEventListener('mousedown', this.onDocMouseDown);
      this.$nextTick(this.focusCellEditor);
    },

    // 编辑器挂载 / 切换后聚焦并全选，便于直接输入覆盖
    focusCellEditor() {
      const pm = this.$el.querySelector<HTMLElement>('.ProseMirror');
      if (!pm) return;
      pm.focus();
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(pm);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    },

    // 内容回写：位置显式传入，与编辑器卸载 / 切换的 flush 时序解耦
    writeCellText(r: number, c: number, text: string) {
      const row = this.element.data[r];
      const cell = row && row[c];
      if (!cell || cell.text === text) return;
      const data: PptTableCell[][] = this.element.data.map((rowItem, ri) =>
        rowItem.map((item, ci) => (ri === r && ci === c ? { ...item, text } : item))
      );
      this.$emit('cell-update', data);
    },

    // Escape 提交：写回后退出编辑
    onCellEditorCommit(r: number, c: number, payload: { text: string }) {
      this.writeCellText(r, c, payload.text);
      this.exitCell();
    },

    // 点击表格外部退出编辑（fx 级联面板挂 body，视为内部）：
    // 最终内容由编辑器失焦 / 卸载 flush 写回，此处只负责退出
    onDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (this.$el.contains(target)) return;
      if (target.closest('.vpk-biz-var-picker')) return;
      this.exitCell();
    },

    exitCell() {
      this.editingCell = null;
      document.removeEventListener('mousedown', this.onDocMouseDown);
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
/* 编辑态：td 作为定位基准（业务文本 fx 按钮锚定单元格右上角） */
.vpk-table-inner td.editing {
  position: relative;
}
</style>
