<template>
  <div class="vpk-editor">
    <Toolbar :doc="state.doc" :state="state" @insert="state.addElement" @save="$emit('save')" />
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
            @element-contextmenu="onElementContextMenu"
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

    <!-- 元素右键菜单（参考 PPTist EditableElement contextmenus） -->
    <div
      v-if="elMenu.visible"
      class="vpk-contextmenu"
      :style="{ left: elMenu.x + 'px', top: elMenu.y + 'px' }"
    >
      <template v-for="(item, i) in elMenuItems">
        <div v-if="item.divider" :key="'d' + i" class="vpk-contextmenu-divider" />
        <div v-else :key="'i' + i" class="vpk-contextmenu-item" @click="handleElMenuClick(item)">
          <span class="vpk-contextmenu-text">{{ item.text }}</span>
          <span v-if="item.subText" class="vpk-contextmenu-sub">{{ item.subText }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { computed, provide, reactive, onMounted, onUnmounted, watch } from '@vue/composition-api';
import { createEmitter, EDITOR_EMITTER, PptDocumentModel, PptElementModel } from '@vue-ppt-kit/core';
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
    // 编辑器实例级事件转发器：Toolbar / TextElement 等经 inject 获取，
    // 页面上多个 PptStage 实例时富文本命令 / 状态回显互不串扰
    provide(EDITOR_EMITTER, createEmitter());

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
      const prevId = state.selectedElementId.value;
      state.selectedElementId.value = el ? el.id : '';
      // 选中切换（含点击空白）时退出文本编辑：编辑态 blur 只回写不退出，
      // 退出编辑仅由选中切换 / 点击空白 / Escape 触发（PPTist 同款交互模型）
      if (!el || el.id !== prevId) state.editingElementId.value = '';
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

    // ==================== 元素右键菜单（参考 PPTist EditableElement contextmenus） ====================

    interface ElMenuItem {
      text?: string;
      subText?: string;
      handler?: () => void;
      divider?: boolean;
    }

    const elMenu = reactive({ visible: false, x: 0, y: 0, element: null as PptElementModel | null });

    const elMenuItems = computed<ElMenuItem[]>(() => {
      const el = elMenu.element;
      if (!el) return [];
      return [
        { text: '复制', subText: 'Ctrl + C', handler: () => state.copyElement(el.id) },
        { divider: true },
        { text: '水平居中', handler: () => state.alignElementToCanvas(el.id, 'horizontal') },
        { text: '垂直居中', handler: () => state.alignElementToCanvas(el.id, 'vertical') },
        { divider: true },
        { text: '置于顶层', handler: () => state.orderElement(el.id, 'top') },
        { text: '上移一层', handler: () => state.orderElement(el.id, 'up') },
        { text: '下移一层', handler: () => state.orderElement(el.id, 'down') },
        { text: '置于底层', handler: () => state.orderElement(el.id, 'bottom') },
        { divider: true },
        { text: '删除', subText: 'Delete', handler: () => state.removeElement(el.id) },
      ];
    });

    const onElementContextMenu = (payload: { element: PptElementModel; x: number; y: number }) => {
      elMenu.visible = true;
      elMenu.x = payload.x;
      elMenu.y = payload.y;
      elMenu.element = payload.element;
    };

    const handleElMenuClick = (item: ElMenuItem) => {
      item.handler?.();
      elMenu.visible = false;
    };

    const onGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.vpk-contextmenu')) elMenu.visible = false;
    };

    onMounted(() => {
      document.addEventListener('mousedown', onGlobalMouseDown);
    });

    onUnmounted(() => {
      document.removeEventListener('mousedown', onGlobalMouseDown);
    });

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
      elMenu,
      elMenuItems,
      onElementContextMenu,
      handleElMenuClick,
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
