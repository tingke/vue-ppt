<template>
  <!-- 颜色弹层：预设色板 + 自定义取色；fixed 定位，坐标由父组件计算 -->
  <div class="vpk-color-popup" :style="popupStyle">
    <div class="vpk-color-swatches">
      <button
        v-for="c in PALETTE"
        :key="c"
        type="button"
        class="vpk-swatch"
        :style="{ background: c }"
        :title="c"
        @mousedown.prevent
        @click="emit('select', c)"
      />
    </div>
    <div class="vpk-color-custom">
      <span class="vpk-color-custom-label">自定义</span>
      <input type="color" :value="currentColor" @input="emit('select', ($event.target as HTMLInputElement).value)" />
      <button v-if="showNone" type="button" class="vpk-color-none" @mousedown.prevent @click="emit('select', '')">无填充</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';
import { PALETTE } from '@vue-ppt/core';

// @mousedown.prevent 保持编辑区焦点与选区（编辑态下设置字体颜色时不打断选区）
defineProps<{
  /** 弹层 fixed 定位坐标（父组件依据触发按钮计算） */
  popupStyle: CSSProperties;
  /** 自定义取色器的当前值 */
  currentColor: string;
  /** 是否提供「无填充」按钮（文本框填充色场景） */
  showNone?: boolean;
}>();

const emit = defineEmits<{
  /** 选择颜色；空字符串表示清除（无填充） */
  (e: 'select', color: string): void;
}>();
</script>

<style scoped>
.vpk-color-popup {
  position: fixed;
  z-index: 40;
  /* 9 列色板（9x18px + 8x4px 间距）+ 内边距，宽度精确容纳不溢出 */
  width: 212px;
  padding: 8px;
  background: #fff;
  border: 1px solid var(--vpk-border, #e4e7ed);
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
}
.vpk-color-swatches {
  display: grid;
  grid-template-columns: repeat(9, 18px);
  gap: 4px;
}
.vpk-swatch {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 2px;
  cursor: pointer;
  box-sizing: border-box;
}
.vpk-swatch:hover {
  transform: scale(1.12);
  border-color: var(--vpk-primary, #409eff);
}
.vpk-color-custom {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--vpk-border, #ebeef5);
}
.vpk-color-custom-label {
  font-size: 12px;
  color: #606266;
}
.vpk-color-custom input[type='color'] {
  width: 26px;
  height: 22px;
  padding: 0;
  border: 1px solid #dcdcdc;
  border-radius: 2px;
  background: #fff;
  cursor: pointer;
  box-sizing: border-box;
}
.vpk-color-none {
  margin-left: auto;
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  background: #fff;
  color: #606266;
  cursor: pointer;
}
.vpk-color-none:hover {
  color: var(--vpk-primary, #409eff);
  border-color: var(--vpk-primary, #409eff);
}
</style>
