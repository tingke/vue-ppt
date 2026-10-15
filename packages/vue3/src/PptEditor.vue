<template>
  <div class="vpk-editor">
    <Toolbar :doc="state.doc" :state="state" @insert="state.addElement" @save="emit('save')" />
    <div class="vpk-main">
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
    <Teleport to="body">
      <div
        v-if="elMenu.visible"
        class="vpk-contextmenu"
        :style="{ left: `${elMenu.x}px`, top: `${elMenu.y}px` }"
      >
        <template v-for="(item, i) in elMenuItems" :key="i">
          <div v-if="'divider' in item" class="vpk-contextmenu-divider" />
          <div v-else class="vpk-contextmenu-item" @click="handleElMenuClick(item)">
            <span class="vpk-contextmenu-text">{{ item.text }}</span>
            <span v-if="item.subText" class="vpk-contextmenu-sub">{{ item.subText }}</span>
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch, type PropType } from 'vue';
import type { PptDocumentModel, PptElementModel } from '@vue-ppt-kit/core';
import { useSlides } from './useSlides';
import { useCanvasScale } from './useCanvasScale';
import SlideThumbnails from './SlideThumbnails.vue';
import SlideCanvas from './SlideCanvas.vue';
import Toolbar from './Toolbar.vue';

const props = defineProps({
  document: { type: Object as PropType<PptDocumentModel>, default: undefined },
});

// 保存事件：由 Toolbar 触发，转发给宿主应用自行处理持久化
const emit = defineEmits<{ (e: 'save'): void }>();

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

// 切换页面时清除选中 / 编辑态
watch(
  () => state.slideIndex.value,
  () => {
    state.selectedElementId.value = '';
    state.editingElementId.value = '';
  }
);

// ==================== 元素交互事件（坐标换算已在 SlideCanvas 内完成） ====================

function onSelectElement(el: PptElementModel | null) {
  state.selectedElementId.value = el ? el.id : '';
  if (!el) state.editingElementId.value = '';
}

function onElementDragMove(payload: { id: string; x: number; y: number }) {
  state.updateElement(payload.id, { x: payload.x, y: payload.y });
}

function onElementResizeMove(payload: { id: string; x: number; y: number; width: number; height: number }) {
  state.updateElement(payload.id, payload);
}

function onEditText(el: PptElementModel) {
  state.selectedElementId.value = el.id;
  state.editingElementId.value = el.id;
}

function onUpdateText(payload: { id: string; text: string; height: number }) {
  if (!payload.text.trim()) {
    // 空文本：删除元素（参考 PPTist checkEmptyText）
    state.removeElement(payload.id);
  } else {
    state.updateElement(payload.id, { text: payload.text, height: payload.height });
  }
  state.editingElementId.value = '';
}

// 编辑过程中实时写回内容与高度，保证画布显示与输入同步
function onInputText(payload: { id: string; text: string; height: number }) {
  state.updateElement(payload.id, { text: payload.text, height: payload.height });
}

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

function onElementContextMenu(payload: { element: PptElementModel; x: number; y: number }) {
  elMenu.visible = true;
  elMenu.x = payload.x;
  elMenu.y = payload.y;
  elMenu.element = payload.element;
}

function handleElMenuClick(item: ElMenuItem) {
  item.handler?.();
  closeElMenu();
}

function closeElMenu() {
  elMenu.visible = false;
}

function onGlobalMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.vpk-contextmenu')) closeElMenu();
}

onMounted(() => {
  document.addEventListener('mousedown', onGlobalMouseDown);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', onGlobalMouseDown);
});
</script>

<style scoped>
.vpk-editor {
  display: flex;
  flex-direction: column;
  height: 560px;
  min-height: 320px;
  background: var(--vpk-stage-bg, #f5f7fa);
  border: 1px solid var(--vpk-border, #ebeef5);
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
