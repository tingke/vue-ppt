<template>
  <div class="vpk-editor">
    <Toolbar :doc="state.doc" @insert="state.addElement" />
    <div class="vpk-main">
      <SlideThumbnails
        :doc="state.doc"
        :slide-index="state.slideIndex"
        @select="onSelect"
        @create="state.createSlide"
        @copy="state.copySlide"
        @remove="state.deleteSlide"
        @move="state.moveSlide"
      />
      <div
        ref="canvas"
        class="vpk-editor-canvas"
        @wheel="handleMousewheelCanvas"
      >
        <!-- 参考 PPTist：viewport 固定为文档实际尺寸，通过 transform scale 缩放 -->
        <div
          class="vpk-viewport"
          :style="{
            width: state.doc.width + 'px',
            height: state.doc.height + 'px',
            left: viewportLeft + 'px',
            top: viewportTop + 'px',
            transform: 'scale(' + canvasScale + ')',
          }"
        >
          <SlideCanvas
            :slide="state.currentSlide.value"
            :width="state.doc.width"
            :height="state.doc.height"
            :scale="1"
            :canvas-scale="canvasScale"
            :selected-id="state.selectedElementId.value"
            :editing-id="state.editingElementId.value"
            @select="onSelectElement"
            @drag-move="onElementDragMove"
            @resize-move="onElementResizeMove"
            @edit-text="onEditText"
            @update-text="onUpdateText"
            @input-text="onInputText"
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
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { computed, watch } from '@vue/composition-api';
import { PptDocumentModel, PptElementModel } from '@vue-ppt-kit/core';
import { useSlides } from './useSlides';
import { useCanvasScale } from './useCanvasScale';
import SlideThumbnails from './SlideThumbnails.vue';
import SlideCanvas from './SlideCanvas.vue';
import Toolbar from './Toolbar.vue';

export default Vue.extend({
  name: 'PptStage',
  components: { SlideThumbnails, SlideCanvas, Toolbar },
  props: {
    document: { type: Object as () => PptDocumentModel, default: undefined },
  },
  setup(props, { refs }) {
    const initialDoc = props.document as PptDocumentModel | undefined;
    const state = useSlides(initialDoc ? { document: initialDoc } : undefined);

    const canvasRef = computed(() => (refs.canvas as HTMLElement) || null);
    const docWidth = computed(() => state.doc.width);
    const docHeight = computed(() => state.doc.height);

    const scaleState = useCanvasScale(canvasRef as any, docWidth, docHeight);

    // 文档尺寸变化时重新计算视口
    watch([docWidth, docHeight], () => scaleState.setViewportPosition());

    // 切换页面时清除选中 / 编辑态
    watch(
      () => state.slideIndex.value,
      () => {
        state.selectedElementId.value = '';
        state.editingElementId.value = '';
      }
    );

    // ==================== 元素交互事件（坐标换算已在 SlideCanvas 内完成） ====================

    const onSelectElement = (el: PptElementModel | null) => {
      state.selectedElementId.value = el ? el.id : '';
      if (!el) state.editingElementId.value = '';
    };

    const onElementDragMove = (payload: { id: string; x: number; y: number }) => {
      state.updateElement(payload.id, { x: payload.x, y: payload.y });
    };

    const onElementResizeMove = (payload: { id: string; x: number; y: number; width: number; height: number }) => {
      state.updateElement(payload.id, payload);
    };

    const onEditText = (el: PptElementModel) => {
      state.selectedElementId.value = el.id;
      state.editingElementId.value = el.id;
    };

    const onUpdateText = (payload: { id: string; text: string; height: number }) => {
      if (!payload.text.trim()) {
        // 空文本：删除元素（参考 PPTist checkEmptyText）
        state.removeElement(payload.id);
      } else {
        state.updateElement(payload.id, { text: payload.text, height: payload.height });
      }
      state.editingElementId.value = '';
    };

    // 编辑过程中实时写回内容与高度，保证画布显示与输入同步
    const onInputText = (payload: { id: string; text: string; height: number }) => {
      state.updateElement(payload.id, { text: payload.text, height: payload.height });
    };

    return {
      state,
      canvasRef,
      onSelect: (i: number) => { state.slideIndex.value = i; },
      onSelectElement,
      onElementDragMove,
      onElementResizeMove,
      onEditText,
      onUpdateText,
      onInputText,
      ...scaleState,
    };
  },
});
</script>

<style scoped>
.vpk-editor {
  display: flex;
  flex-direction: column;
  height: 560px;
  min-height: 320px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  box-sizing: border-box;
  overflow: hidden;
}
.vpk-main {
  display: flex;
  flex: 1;
  min-height: 0;
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
  border: 1px solid #e4e7ed;
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
  color: #409eff;
}
.vpk-zoom-text {
  min-width: 46px;
  text-align: center;
  font-size: 12px;
  cursor: pointer;
  color: #303133;
}
</style>
