<template>
  <!-- 表格元素（biz 为 true 时即富表格：单元格为业务文本）
       （vue2 / vue3 双端共享，P1-3：普通 defineComponent + setup()） -->
  <div ref="rootRef" class="vpk-table" :style="tableStyle" @mousedown="onRootMouseDown">
    <table class="vpk-table-inner">
      <colgroup>
        <col v-for="(w, i) in colWidths" :key="i" :style="{ width: w * 100 + '%' }" />
      </colgroup>
      <tbody>
        <tr v-for="(row, r) in element.data" :key="r">
          <!-- key 置于子节点（vue2 模板约束；vue3 编译器同样接受） -->
          <template v-for="(cell, c) in row">
            <td
              v-if="!isCoveredCell(r, c)"
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
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, onBeforeUnmount, ref } from '@vpk/vue-api';
import type { PropType } from '@vpk/vue-api';
import { computeCoveredCells, sanitizeRichText } from '@tthappy/ppt-core';
import type { PptBizTableElement, PptBizTextElement, PptTableCell, PptTableElement, PptTextElement } from '@tthappy/ppt-core';
import TextElement from './TextElement.vue';
import BizTextElement from './BizTextElement.vue';

// 双击单元格进入编辑（单元格内挂富文本编辑器，
// 失焦 / 卸载 flush / Escape 提交）。biz 为 true 时即富表格：单元格为业务文本（fx 业务字段混排）
export default defineComponent({
  name: 'PptTableElement',
  components: { TextElement, BizTextElement },
  props: {
    element: { type: Object as PropType<PptTableElement | PptBizTableElement>, required: true },
    scale: { type: Number, default: 1 },
    /** 静态渲染（缩略图等）：不响应双击编辑 */
    static: { type: Boolean, default: false },
    /** 富表格模式：单元格编辑器为业务文本组件（BizTextElement） */
    biz: { type: Boolean, default: false },
  },
  emits: ['cell-update'],
  setup(props, { emit }) {
    const rootRef = ref<HTMLElement | null>(null);
    // 当前编辑中的单元格（null 为非编辑态）
    const editingCell = ref<{ r: number; c: number } | null>(null);

    const colWidths = computed<number[]>(() => {
      const data = props.element.data;
      const colCount = data.length ? data[0].length : 0;
      if (props.element.colWidths && props.element.colWidths.length === colCount) {
        return props.element.colWidths;
      }
      return new Array(colCount).fill(1 / (colCount || 1));
    });

    // 被合并单元格覆盖的坐标集合（"r:c"），渲染层跳过保证每行列数与 colgroup 一致
    const coveredCells = computed(() => computeCoveredCells(props.element.data));

    function isCoveredCell(r: number, c: number): boolean {
      return coveredCells.value.has(r + ':' + c);
    }

    const tableStyle = computed<Record<string, string>>(() => ({
      borderColor: props.element.outlineColor ?? '#dcdcdc',
      color: props.element.color ?? '#606266',
    }));

    function cellStyle(row: number): Record<string, string | undefined> {
      const el = props.element;
      const isHeader = row === 0 && el.headerFill;
      return {
        fontSize: (el.fontSize ?? 14) * props.scale + 'px',
        background: isHeader ? el.headerFill : undefined,
        color: isHeader ? el.headerColor ?? '#fff' : undefined,
      };
    }

    function isEditingCell(r: number, c: number): boolean {
      return !!editingCell.value && editingCell.value.r === r && editingCell.value.c === c;
    }

    // 编辑器伪元素：id 取 cell.id（防富文本命令误投递），样式取表格级属性（表头行用表头色）。
    // 已知取舍：正因 target 为 cell.id ≠ 表格 id，工具栏富文本命令（字体/字号/颜色/加粗）
    // 对单元格编辑不生效，单元格内仅 Mod+B/I/U 等编辑器快捷键可用；
    // 打通需将「当前编辑单元格」提升为编辑器级状态（后续版本跟进）
    function cellBase(cell: PptTableCell, row: number) {
      const el = props.element;
      const isHeader = row === 0 && el.headerFill;
      return {
        id: cell.id,
        x: 0,
        y: 0,
        width: el.width,
        height: el.height,
        text: cell.text,
        fontSize: el.fontSize ?? 14,
        color: isHeader ? el.headerColor ?? '#fff' : el.color ?? '#606266',
        align: 'left' as const,
      };
    }
    function cellTextElement(cell: PptTableCell, row: number): PptTextElement {
      return { ...cellBase(cell, row), type: 'text' };
    }
    function cellBizTextElement(cell: PptTableCell, row: number): PptBizTextElement {
      return { ...cellBase(cell, row), type: 'bizText' };
    }

    // 编辑中点击其他单元格：切换单元格（编辑器卸载 flush 保证旧内容写回），且不启动拖拽
    function onCellMouseDown(r: number, c: number, e: MouseEvent) {
      if (props.static || !editingCell.value) return;
      e.stopPropagation();
      if (!isEditingCell(r, c)) {
        editingCell.value = { r, c };
        nextTick(focusCellEditor);
      }
    }

    // 单元格编辑中阻止 mousedown 冒泡（点边框等非单元格区域）：画布不拖拽、不切换选中
    function onRootMouseDown(e: MouseEvent) {
      if (editingCell.value) e.stopPropagation();
    }

    function onCellDblClick(r: number, c: number) {
      if (props.static) return;
      editingCell.value = { r, c };
      // 捕获阶段监听：画布元素 mousedown 有 stopPropagation，冒泡阶段到不了 document
      document.addEventListener('mousedown', onDocMouseDown, true);
      nextTick(focusCellEditor);
    }

    // 编辑器挂载 / 切换后聚焦并全选，便于直接输入覆盖
    function focusCellEditor() {
      const root = rootRef.value;
      if (!root) return;
      const pm = root.querySelector('.ProseMirror') as HTMLElement | null;
      if (!pm) return;
      pm.focus();
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(pm);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    // 内容回写：位置显式传入，与编辑器卸载 / 切换的 flush 时序解耦
    function writeCellText(r: number, c: number, text: string) {
      const row = props.element.data[r];
      const cell = row && row[c];
      if (!cell || cell.text === text) return;
      const data: PptTableCell[][] = props.element.data.map((rowItem, ri) =>
        rowItem.map((item, ci) => (ri === r && ci === c ? { ...item, text } : item))
      );
      emit('cell-update', data);
    }

    // Escape 提交：写回后退出编辑
    function onCellEditorCommit(r: number, c: number, payload: { text: string }) {
      writeCellText(r, c, payload.text);
      exitCell();
    }

    // 点击表格外部退出编辑（fx 级联面板挂 body，视为内部）：
    // 最终内容由编辑器失焦 / 卸载 flush 写回，此处只负责退出
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const root = rootRef.value;
      if (root && root.contains(target)) return;
      if (target.closest('.vpk-biz-var-picker')) return;
      exitCell();
    }

    function exitCell() {
      editingCell.value = null;
      document.removeEventListener('mousedown', onDocMouseDown, true);
    }

    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onDocMouseDown, true);
    });

    return {
      rootRef,
      colWidths,
      tableStyle,
      sanitizeRichText,
      isCoveredCell,
      cellStyle,
      isEditingCell,
      cellTextElement,
      cellBizTextElement,
      onCellMouseDown,
      onRootMouseDown,
      onCellDblClick,
      writeCellText,
      onCellEditorCommit,
    };
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
