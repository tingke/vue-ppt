<template>
  <div class="vpk-toolbar">
    <!-- 参考 PPTist CanvasTool 的 add-element-handler：插入文字 / 插入图片 / 插入表格 -->
    <button class="vpk-tool-btn" title="插入文字" @click="insertTextElement">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 7V4h16v3" /><path d="M12 4v16" /><path d="M9 20h6" />
      </svg>
      <span>文字</span>
    </button>

    <button class="vpk-tool-btn" title="插入图片" @click="triggerImagePick">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
      </svg>
      <span>图片</span>
    </button>

    <div class="vpk-tool-anchor">
      <button class="vpk-tool-btn" title="插入表格" :class="{ active: tablePickerVisible }" @click="toggleTablePicker">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M9 10v10" /><path d="M15 10v10" />
        </svg>
        <span>表格</span>
      </button>

      <!-- 参考 PPTist TableGenerator：10x10 网格悬停选择行列，支持自定义输入 -->
      <div v-if="tablePickerVisible" class="vpk-table-picker" @mouseleave="endCell = []">
        <div class="vpk-table-picker-title">
          <span>{{ isCustom ? '自定义表格' : '表格 ' + (endCell.length ? endCell[0] + ' x ' + endCell[1] : '') }}</span>
          <span class="vpk-table-picker-actions">
            <button type="button" class="vpk-table-picker-toggle" @click="isCustom = !isCustom">{{ isCustom ? '返回' : '自定义' }}</button>
            <span class="vpk-table-picker-close" @click="tablePickerVisible = false">×</span>
          </span>
        </div>
        <div v-if="!isCustom" class="vpk-table-picker-grid">
          <span
            v-for="row in 10"
            :key="row"
            class="vpk-picker-row"
          >
            <button
              v-for="col in 10"
              :key="col"
              type="button"
              class="vpk-picker-cell"
              :class="{ active: endCell.length && row <= endCell[0] && col <= endCell[1] }"
              :aria-label="row + ' 行 ' + col + ' 列'"
              @mouseenter="endCell = [row, col]"
              @click="insertTableElement(row, col)"
            />
          </span>
        </div>
        <div v-else class="vpk-table-custom">
          <div class="vpk-table-custom-row">
            <label>行数：</label>
            <input v-model.number="customRow" type="number" min="1" max="20" />
          </div>
          <div class="vpk-table-custom-row">
            <label>列数：</label>
            <input v-model.number="customCol" type="number" min="1" max="20" />
          </div>
          <div class="vpk-table-custom-btns">
            <button type="button" class="vpk-btn" @click="isCustom = false">返回</button>
            <button type="button" class="vpk-btn primary" @click="insertCustomTable">确认</button>
          </div>
        </div>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="image/*" class="vpk-file-input" @change="onFileChange" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { PptDocumentModel, PptElementModel, PptTableCell, PptTableElement } from '@vue-ppt-kit/core';

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// 参考 PPTist useCreateElement：创建元素后插入当前页并居中
export default Vue.extend({
  name: 'PptToolbar',
  props: {
    doc: { type: Object as () => PptDocumentModel, required: true },
  },
  data() {
    return {
      tablePickerVisible: false,
      endCell: [] as number[],
      // 自定义行列（参考 PPTist TableGenerator 的自定义模式）
      isCustom: false,
      customRow: 3,
      customCol: 3,
    };
  },
  mounted() {
    document.addEventListener('mousedown', this.onOutsideClick);
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onOutsideClick);
  },
  methods: {
    emitInsert(element: PptElementModel) {
      this.$emit('insert', element);
    },
    insertTextElement() {
      const width = Math.round(this.doc.width * 0.5);
      const height = 60;
      this.emitInsert({
        id: genId(),
        type: 'text',
        x: Math.round((this.doc.width - width) / 2),
        y: Math.round((this.doc.height - height) / 2),
        width,
        height,
        text: '请输入文字',
        fontSize: 20,
        color: '#303133',
      });
    },
    triggerImagePick() {
      (this.$refs.fileInput as HTMLInputElement).click();
    },
    onFileChange(e: Event) {
      const input = e.target as HTMLInputElement;
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const img = new Image();
        img.onload = () => {
          // 参考 PPTist createImageElement：按原图比例缩放至文档尺寸内并居中
          const maxWidth = this.doc.width * 0.6;
          const maxHeight = this.doc.height * 0.6;
          const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
          const width = Math.round(img.width * scale);
          const height = Math.round(img.height * scale);
          this.emitInsert({
            id: genId(),
            type: 'image',
            x: Math.round((this.doc.width - width) / 2),
            y: Math.round((this.doc.height - height) / 2),
            width,
            height,
            src,
          });
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    toggleTablePicker() {
      this.tablePickerVisible = !this.tablePickerVisible;
      if (this.tablePickerVisible) {
        this.isCustom = false;
        this.endCell = [];
      } else {
        this.endCell = [];
      }
    },
    insertCustomTable() {
      const row = Math.min(20, Math.max(1, Math.round(this.customRow) || 1));
      const col = Math.min(20, Math.max(1, Math.round(this.customCol) || 1));
      this.insertTableElement(row, col);
      this.isCustom = false;
    },
    insertTableElement(row: number, col: number) {
      const cellWidth = Math.min(100, (this.doc.width * 0.8) / col);
      const cellHeight = 36;
      const width = Math.round(cellWidth * col);
      const height = cellHeight * row;
      const data: PptTableCell[][] = [];
      for (let r = 0; r < row; r++) {
        const rowCells: PptTableCell[] = [];
        for (let c = 0; c < col; c++) {
          rowCells.push({ id: genId(), text: '', colspan: 1, rowspan: 1 });
        }
        data.push(rowCells);
      }
      const table: PptTableElement = {
        id: genId(),
        type: 'table',
        x: Math.round((this.doc.width - width) / 2),
        y: Math.round((this.doc.height - height) / 2),
        width,
        height,
        data,
        colWidths: new Array(col).fill(1 / col),
        outlineColor: '#dcdcdc',
        headerFill: '#ecf5ff',
        headerColor: '#409eff',
        fontSize: 14,
        color: '#606266',
      };
      this.tablePickerVisible = false;
      this.isCustom = false;
      this.endCell = [];
      this.emitInsert(table);
    },
    onOutsideClick(e: MouseEvent) {
      if (!this.tablePickerVisible) return;
      if (this.$el && !(this.$el as HTMLElement).contains(e.target as Node)) {
        this.tablePickerVisible = false;
        this.endCell = [];
      }
    },
  },
});
</script>

<style scoped>
.vpk-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 0 10px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
  box-sizing: border-box;
  user-select: none;
}
/* 视觉隐藏但保持可访问的文件选择框 */
.vpk-file-input {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 1px;
  height: 1px;
  opacity: 0.01;
  border: none;
  padding: 0;
}
.vpk-tool-anchor {
  position: relative;
  display: flex;
}
.vpk-tool-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
}
.vpk-tool-btn:hover,
.vpk-tool-btn.active {
  background: #f5f7fa;
  color: #409eff;
}
.vpk-tool-btn svg {
  width: 15px;
  height: 15px;
}
.vpk-table-picker {
  position: absolute;
  top: 34px;
  left: 0;
  z-index: 30;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  padding: 8px;
}
.vpk-table-picker-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 20px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #606266;
}
.vpk-table-picker-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.vpk-table-picker-toggle {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  cursor: pointer;
  color: #409eff;
}
.vpk-table-picker-toggle:hover {
  text-decoration: underline;
}
/* 自定义行列面板（参考 PPTist TableGenerator 自定义模式） */
.vpk-table-custom {
  width: 170px;
}
.vpk-table-custom-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.vpk-table-custom-row label {
  flex: 1;
  font-size: 12px;
  color: #606266;
}
.vpk-table-custom-row input {
  flex: 1.4;
  height: 24px;
  padding: 0 6px;
  font-size: 12px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  box-sizing: border-box;
  color: #606266;
}
.vpk-table-custom-row input:focus {
  outline: none;
  border-color: #409eff;
}
.vpk-table-custom-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 2px;
}
.vpk-btn {
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
}
.vpk-btn:hover {
  color: #409eff;
  border-color: #409eff;
}
.vpk-btn.primary {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
.vpk-btn.primary:hover {
  background: #66b1ff;
  border-color: #66b1ff;
  color: #fff;
}
.vpk-table-picker-close {
  cursor: pointer;
  color: #909399;
  padding: 0 2px;
}
.vpk-table-picker-close:hover {
  color: #409eff;
}
.vpk-table-picker-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.vpk-picker-row {
  display: flex;
  gap: 2px;
}
.vpk-picker-cell {
  width: 18px;
  height: 18px;
  padding: 0;
  background: #f5f7fa;
  border: 1px solid #dcdcdc;
  border-radius: 2px;
  cursor: pointer;
  box-sizing: border-box;
}
.vpk-picker-cell.active {
  background: rgba(64, 158, 255, 0.12);
  border-color: #409eff;
}
</style>
