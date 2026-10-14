<template>
  <div class="vpk-editor">
    <SlideThumbnails
      :doc="state.doc"
      :slide-index="state.slideIndex"
      @select="(i) => (state.slideIndex.value = i)"
      @create="state.createSlide()"
      @copy="(i) => state.copySlide(i)"
      @remove="(i) => state.deleteSlide(i)"
      @move="(from, to) => state.moveSlide(from, to)"
    />
    <div
      ref="canvasRef"
      class="vpk-editor-canvas"
      @wheel="handleMousewheelCanvas"
    >
      <!-- 参考 PPTist：viewport 固定为文档实际尺寸，通过 transform scale 缩放 -->
      <div
        class="vpk-viewport"
        :style="{
          width: `${state.doc.width}px`,
          height: `${state.doc.height}px`,
          left: `${viewportLeft}px`,
          top: `${viewportTop}px`,
          transform: `scale(${canvasScale})`,
        }"
      >
        <SlideCanvas
          :slide="state.currentSlide.value"
          :width="state.doc.width"
          :height="state.doc.height"
          :scale="1"
        />
      </div>

      <!-- 缩放控件：参考 PPTist CanvasTool 的缩放模块 -->
      <div class="vpk-zoom-tool">
        <span class="vpk-zoom-btn" title="缩小 (Ctrl + -)" @click="scaleCanvas('-')">−</span>
        <span class="vpk-zoom-text" title="点击重置 (Ctrl + 0)" @click="resetCanvas">{{ canvasScalePercentage }}</span>
        <span class="vpk-zoom-btn" title="放大 (Ctrl + +)" @click="scaleCanvas('+')">+</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type PropType } from 'vue';
import type { PptDocumentModel } from '@vue-ppt-kit/core';
import { useSlides } from './useSlides';
import { useCanvasScale } from './useCanvasScale';
import SlideThumbnails from './SlideThumbnails.vue';
import SlideCanvas from './SlideCanvas.vue';

const props = defineProps({
  document: { type: Object as PropType<PptDocumentModel>, default: undefined },
});

const state = useSlides(props.document ? { document: props.document } : undefined);

const canvasRef = ref<HTMLElement>();
const docWidth = computed(() => state.doc.width);
const docHeight = computed(() => state.doc.height);
const {
  canvasScale,
  canvasScalePercentage,
  viewportLeft,
  viewportTop,
  setViewportPosition,
  scaleCanvas,
  resetCanvas,
  handleMousewheelCanvas,
} = useCanvasScale(canvasRef, docWidth, docHeight);

// 文档尺寸变化时重新计算视口
watch([docWidth, docHeight], () => setViewportPosition());
</script>

<style scoped>
.vpk-editor {
  display: flex;
  height: 560px;
  min-height: 320px;
  background: var(--vpk-stage-bg, #f5f7fa);
  border: 1px solid var(--vpk-border, #ebeef5);
  box-sizing: border-box;
  overflow: hidden;
}
.vpk-editor-canvas {
  position: relative;
  flex: 1;
  overflow: hidden;
}
.vpk-viewport {
  position: absolute;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transform-origin: 0 0;
}
.vpk-zoom-tool {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  padding: 0 4px;
  background: #fff;
  border: 1px solid var(--vpk-border, #e4e7ed);
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  user-select: none;
}
.vpk-zoom-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  border-radius: 3px;
  color: #606266;
}
.vpk-zoom-btn:hover {
  background: #f5f7fa;
  color: var(--vpk-primary, #409eff);
}
.vpk-zoom-text {
  min-width: 46px;
  text-align: center;
  font-size: 12px;
  cursor: pointer;
  color: #303133;
}
</style>
