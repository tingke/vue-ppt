<template>
  <!-- 背景图片图库弹窗（参考 WPS/PowerPoint 背景填充库）：上传多张进列表、可多选 -->
  <div v-if="visible" class="vpk-dialog-overlay" @mousedown.self="emit('close')">
    <div class="vpk-bg-dialog">
      <div class="vpk-bg-dialog-header">
        <button type="button" class="vpk-btn" @click="triggerUpload">＋ 上传</button>
        <span class="vpk-dialog-close" title="关闭" @click="emit('close')">×</span>
      </div>
      <div class="vpk-bg-gallery">
        <div v-if="!bgImages.length" class="vpk-bg-empty">请上传图片</div>
        <div
          v-for="(img, i) in bgImages"
          :key="i"
          class="vpk-bg-thumb"
          :class="{ selected: selectedBgs.includes(img) }"
          @click="toggleBgSelect(img)"
        >
          <img :src="img" alt="" />
          <span v-if="selectedBgs.includes(img)" class="vpk-bg-check">✓</span>
        </div>
      </div>
      <div class="vpk-bg-dialog-footer">
        <span class="vpk-bg-selected-tip">已选 {{ selectedBgs.length }} 张</span>
        <button type="button" class="vpk-btn" @click="emit('close')">取消</button>
        <button type="button" class="vpk-btn primary" :disabled="!selectedBgs.length" @click="confirm">确定</button>
      </div>
      <input ref="uploadInputRef" type="file" accept="image/*" multiple class="vpk-file-input" @change="onUpload" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  createImageElement,
  loadImage,
  readFileAsDataURL,
  type PptDocumentModel,
  type PptImageElement,
} from '@tthappy/ppt-core';

// 组件常驻（仅 overlay 随 visible 显隐），上传的图库列表在多次开关间保留；
// 每次打开时清空已选
const props = defineProps<{
  visible: boolean;
  doc: PptDocumentModel;
}>();

const emit = defineEmits<{
  /** elements 为逐张插入的处理顺序（先选者最后处理，最终位于最底层） */
  (e: 'confirm', elements: PptImageElement[]): void;
  (e: 'close'): void;
}>();

const bgImages = ref<string[]>([]);
const selectedBgs = ref<string[]>([]);
const uploadInputRef = ref<HTMLInputElement>();

watch(
  () => props.visible,
  (v) => {
    if (v) selectedBgs.value = [];
  }
);

// 多选切换：点击选中，再次点击取消
function toggleBgSelect(img: string) {
  const i = selectedBgs.value.indexOf(img);
  if (i >= 0) selectedBgs.value.splice(i, 1);
  else selectedBgs.value.push(img);
}

// 上传本地图片（可多张）：追加进图库列表
async function onUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  for (const file of files) {
    try {
      bgImages.value.push(await readFileAsDataURL(file));
    } catch {
      // 单个文件读取失败：跳过，不影响其余文件
    }
  }
}

function triggerUpload() {
  uploadInputRef.value?.click();
}

// 确定：按选择顺序生成图片元素（等比缩放至整画布内并居中），
// 交由父组件逐张插入并置于底层
async function confirm() {
  const srcs = selectedBgs.value.slice().reverse();
  const elements: PptImageElement[] = [];
  for (const src of srcs) {
    try {
      const img = await loadImage(src);
      elements.push(createImageElement(src, img, props.doc, 1));
    } catch {
      // 图片解码失败：跳过
    }
  }
  selectedBgs.value = [];
  if (elements.length) emit('confirm', elements);
  emit('close');
}
</script>

<style scoped>
.vpk-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
}
.vpk-bg-dialog {
  display: flex;
  flex-direction: column;
  width: 640px;
  max-width: calc(100vw - 48px);
  height: 420px;
  max-height: calc(100vh - 96px);
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.vpk-bg-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--vpk-border, #ebeef5);
}
.vpk-dialog-close {
  padding: 2px 4px;
  font-size: 18px;
  line-height: 1;
  color: #909399;
  cursor: pointer;
}
.vpk-dialog-close:hover {
  color: var(--vpk-primary, #409eff);
}
/* 图库：上下滑动翻页，已选状态由数据驱动、滚动不丢失 */
.vpk-bg-gallery {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-content: flex-start;
  padding: 14px;
  overflow-y: auto;
  box-sizing: border-box;
}
.vpk-bg-empty {
  width: 100%;
  margin-top: 120px;
  font-size: 13px;
  color: #909399;
  text-align: center;
}
.vpk-bg-thumb {
  position: relative;
  width: 104px;
  height: 72px;
  border: 2px solid #dcdfe6;
  border-radius: 4px;
  background: #f5f7fa;
  cursor: pointer;
  overflow: hidden;
  box-sizing: border-box;
  flex-shrink: 0;
}
.vpk-bg-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.vpk-bg-thumb:hover {
  border-color: var(--vpk-primary, #409eff);
}
.vpk-bg-thumb.selected {
  border-color: var(--vpk-primary, #409eff);
}
.vpk-bg-check {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 12px;
  color: #fff;
  background: var(--vpk-primary, #409eff);
  border-radius: 50%;
}
.vpk-bg-dialog-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--vpk-border, #ebeef5);
}
.vpk-bg-selected-tip {
  margin-right: auto;
  font-size: 12px;
  color: #909399;
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
.vpk-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
</style>
