<template>
  <!-- 10x10 网格悬停选择行列，支持自定义输入；fixed 定位避免被滚动容器裁剪 -->
  <div class="vpk-table-picker" :style="popupStyle" @mouseleave="endCell = []">
    <div class="vpk-table-picker-title">
      <span>{{ isCustom ? `自定义${typeName}` : `${typeName} ${endCell.length ? `${endCell[0]} x ${endCell[1]}` : ''}` }}</span>
      <span class="vpk-table-picker-actions">
        <button type="button" class="vpk-table-picker-toggle" @click="isCustom = !isCustom">{{ isCustom ? '返回' : '自定义' }}</button>
        <span class="vpk-table-picker-close" @click="emit('close')">×</span>
      </span>
    </div>
    <div v-if="!isCustom" class="vpk-table-picker-grid">
      <span v-for="row in 10" :key="row" class="vpk-picker-row">
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CSSProperties } from 'vue';
import { createBizTableElement, createTableElement, type PptBizTableElement, type PptDocumentModel, type PptTableElement } from '@vue-ppt/core';

const props = defineProps<{
  /** 弹层 fixed 定位坐标（父组件依据触发按钮计算） */
  popupStyle: CSSProperties;
  doc: PptDocumentModel;
  /** 富表格模式：插入 bizTable 元素（单元格为业务文本） */
  biz?: boolean;
}>();

const emit = defineEmits<{
  (e: 'insert', element: PptTableElement | PptBizTableElement): void;
  (e: 'close'): void;
}>();

const endCell = ref<number[]>([]);
// 自定义行列
const isCustom = ref(false);
const customRow = ref(3);
const customCol = ref(3);

const typeName = computed(() => (props.biz ? '富表格' : '表格'));

function insertCustomTable() {
  const row = Math.min(20, Math.max(1, Math.round(customRow.value) || 1));
  const col = Math.min(20, Math.max(1, Math.round(customCol.value) || 1));
  insertTableElement(row, col);
  isCustom.value = false;
}

function insertTableElement(row: number, col: number) {
  emit('insert', props.biz ? createBizTableElement(props.doc, row, col) : createTableElement(row, col, props.doc));
  emit('close');
}
</script>

<style scoped>
.vpk-table-picker {
  position: fixed;
  z-index: 30;
  background: #fff;
  border: 1px solid var(--vpk-border, #e4e7ed);
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
  color: var(--vpk-primary, #409eff);
}
.vpk-table-picker-toggle:hover {
  text-decoration: underline;
}
/* 自定义行列面板 */
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
  border-color: var(--vpk-primary, #409eff);
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
  color: var(--vpk-primary, #409eff);
  border-color: var(--vpk-primary, #409eff);
}
.vpk-btn.primary {
  background: var(--vpk-primary, #409eff);
  border-color: var(--vpk-primary, #409eff);
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
  color: var(--vpk-primary, #409eff);
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
  border-color: var(--vpk-primary, #409eff);
}
</style>
