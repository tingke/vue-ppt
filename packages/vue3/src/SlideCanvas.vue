<template>
  <div
    class="vpk-canvas"
    :class="{ static }"
    :style="{
      width: `${width * scale}px`,
      height: `${height * scale}px`,
    }"
    @mousedown="onCanvasMouseDown"
  >
    <template v-if="slide">
      <div
        v-for="el in visibleElements"
        :key="el.id"
        class="vpk-element"
        :class="{ interactive: !static, selected: el.id === selectedId || el.id === selectedLinkedId }"
        :style="[elementStyle(el), el.id === selectedId || el.id === selectedLinkedId ? selectedOutline : null]"
        @mousedown="onElementMouseDown(el, $event)"
        @dblclick="onElementDblClick(el)"
        @contextmenu.stop.prevent="onElementContextMenu(el, $event)"
      >
        <component
          :is="elementComponentMap[el.type]"
          v-if="elementComponentMap[el.type]"
          :element="el"
          :scale="scale"
          :editing="el.id === editingId"
          :static="STATIC_ELEMENT_TYPES.includes(el.type) ? static : undefined"
          @commit="onTextCommit(el, $event)"
          @update="onTextUpdate(el, $event)"
          @option="onMediaOption(el, $event)"
          @cell-update="onTableCellUpdate(el, $event)"
        />

        <!-- 选中缩放手柄（文本元素仅左右两点） -->
        <template v-if="!static && el.id === selectedId">
          <span
            v-for="h in resizeHandlers(el)"
            :key="h.direction"
            class="vpk-resize-handle"
            :style="h.style"
            @mousedown.stop="onResizeStart(el, h.direction, $event)"
          ></span>
        </template>
      </div>

      <!-- 对齐吸附线 -->
      <div
        v-for="(l, i) in alignLineViews"
        :key="'al' + i"
        class="vpk-align-line"
        :class="l.type"
        :style="alignLineStyle(l)"
      ></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, type CSSProperties } from 'vue';
import {
  adsorb,
  collectAlignLines,
  computeResize,
  SORPTION_RANGE,
  type AlignLineSet,
  type AlignLineView,
  type PptElementModel,
  type PptMediaElement,
  type PptSlideModel,
  type PptTableCell,
  type ResizeDirection,
} from '@vue-ppt/core';
import { elementComponentMap } from './elements';

const props = withDefaults(defineProps<{
  slide?: PptSlideModel;
  width?: number;
  height?: number;
  scale?: number;
  static?: boolean;
  /** 画布缩放比例，用于屏幕位移 → 文档坐标换算与手柄尺寸补偿 */
  canvasScale?: number;
  selectedId?: string;
  editingId?: string;
}>(), {
  slide: undefined,
  width: 960,
  height: 540,
  scale: 1,
  static: false,
  canvasScale: 1,
  selectedId: '',
  editingId: '',
});

const emit = defineEmits<{
  (e: 'select', element: PptElementModel | null): void;
  (e: 'drag-move', payload: { id: string; x: number; y: number }): void;
  (e: 'resize-move', payload: { id: string; x: number; y: number; width: number; height: number }): void;
  (e: 'edit-text', element: PptElementModel): void;
  (e: 'element-contextmenu', payload: { element: PptElementModel; x: number; y: number }): void;
  (e: 'update-text', payload: { id: string; text: string; height: number }): void;
  (e: 'input-text', payload: { id: string; text: string; height: number }): void;
  (e: 'element-update', payload: { id: string; patch: Partial<PptElementModel> }): void;
}>();

// 元素定位（尺寸/位置按 scale 缩放），内容渲染交给 elements/ 下的类型组件
function elementStyle(el: PptElementModel): CSSProperties {
  return {
    position: 'absolute',
    left: `${el.x * props.scale}px`,
    top: `${el.y * props.scale}px`,
    width: `${el.width * props.scale}px`,
    height: `${el.height * props.scale}px`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
  };
}

// 隐藏元素不渲染（如媒体关联的业务文本经右键隐藏）
const visibleElements = computed<PptElementModel[]>(() => (props.slide?.elements ?? []).filter((e) => !e.hidden));

// 静态渲染透传的元素类型（缩略图等场景组件内不建交互/编辑实例）
const STATIC_ELEMENT_TYPES = ['text', 'bizText', 'media', 'table', 'bizTable'];

// 选中媒体时同步高亮其关联的业务文本（反之不联动）
const selectedLinkedId = computed<string | undefined>(() => {
  const selected = visibleElements.value.find((e) => e.id === props.selectedId);
  return selected && selected.type === 'media' ? (selected as PptMediaElement).textId : undefined;
});

// 仅选中元素显示虚线框，线宽按画布缩放反向补偿，视觉恒定 1px
const selectedOutline = computed(() => ({
  outline: `${1 / props.canvasScale}px dashed var(--vpk-primary, #409eff)`,
}));

// ==================== 对齐吸附（算法在 core/geometry，此处仅做展示与缓存） ====================

const alignLineViews = ref<AlignLineView[]>([]);

function alignLineStyle(l: AlignLineView): CSSProperties {
  const s = props.scale;
  return l.type === 'h'
    ? { top: `${l.value * s}px`, left: `${l.range[0] * s}px`, width: `${(l.range[1] - l.range[0]) * s}px` }
    : { left: `${l.value * s}px`, top: `${l.range[0] * s}px`, height: `${(l.range[1] - l.range[0]) * s}px` };
}

// ==================== 元素拖动 ====================

// mousedown 起始、document 级跟踪、误操作判定、吸附校正
interface DragContext {
  element: PptElementModel;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  isMisoperation: boolean | null;
  /** mousedown 时收集的吸附线缓存：拖动中其他元素不动，无需每帧重算 */
  alignLines: AlignLineSet;
  /** 媒体关联的业务文本（拖动媒体时跟随移动，保持相对位置） */
  linked: { id: string; x: number; y: number } | null;
}
let dragContext: DragContext | null = null;

function onCanvasMouseDown() {
  if (props.static) return;
  emit('select', null);
}

function onElementMouseDown(el: PptElementModel, e: MouseEvent) {
  if (props.static) return;
  e.preventDefault();
  e.stopPropagation();
  emit('select', el);
  dragContext = {
    element: el,
    startX: e.clientX,
    startY: e.clientY,
    originX: el.x,
    originY: el.y,
    isMisoperation: null,
    alignLines: collectAlignLines((props.slide?.elements ?? []).filter((e) => !e.hidden), props.width, props.height, el.id),
    linked: null,
  };
  // 媒体元素：关联业务文本随媒体一起拖动（保持相对位置）
  if (el.type === 'media') {
    const textId = (el as PptMediaElement).textId;
    const linked = textId ? props.slide?.elements.find((e) => e.id === textId) : null;
    if (linked) dragContext.linked = { id: linked.id, x: linked.x, y: linked.y };
  }
  document.addEventListener('mousemove', onDocumentMouseMove);
  document.addEventListener('mouseup', onDocumentMouseUp);
}

function onDocumentMouseMove(e: MouseEvent) {
  const ctx = dragContext;
  if (!ctx) return;

  // 误操作判定：首次移动距离过小视为点击，不触发拖动
  if (ctx.isMisoperation !== false) {
    ctx.isMisoperation =
      Math.abs(e.clientX - ctx.startX) < SORPTION_RANGE &&
      Math.abs(e.clientY - ctx.startY) < SORPTION_RANGE;
  }
  if (ctx.isMisoperation) return;

  const moveX = (e.clientX - ctx.startX) / props.canvasScale;
  const moveY = (e.clientY - ctx.startY) / props.canvasScale;

  let x = ctx.originX + moveX;
  let y = ctx.originY + moveY;

  // 吸附：目标位置四边/中心与其他元素及画布对齐（吸附线已在 mousedown 时缓存）
  const { h, v } = ctx.alignLines;
  const lines: AlignLineView[] = [];
  const av = adsorb(x, x + ctx.element.width, v, 'v');
  if (av) {
    x -= av.offset;
    lines.push(av.line);
  }
  const ah = adsorb(y, y + ctx.element.height, h, 'h');
  if (ah) {
    y -= ah.offset;
    lines.push(ah.line);
  }
  alignLineViews.value = lines;

  emit('drag-move', { id: ctx.element.id, x, y });
  // 关联业务文本跟随媒体移动（保持相对位置）
  if (ctx.linked) {
    emit('drag-move', { id: ctx.linked.id, x: ctx.linked.x + (x - ctx.originX), y: ctx.linked.y + (y - ctx.originY) });
  }
}

function onDocumentMouseUp() {
  if (!dragContext) return;
  dragContext = null;
  document.removeEventListener('mousemove', onDocumentMouseMove);
  document.removeEventListener('mouseup', onDocumentMouseUp);
  alignLineViews.value = [];
}

// ==================== 缩放手柄 ====================

interface ResizeContext {
  element: PptElementModel;
  direction: ResizeDirection;
  startX: number;
  startY: number;
  origin: { x: number; y: number; width: number; height: number };
  /** 手柄按下时收集的吸附线缓存 */
  alignLines: AlignLineSet;
}
let resizeContext: ResizeContext | null = null;

function resizeHandlers(el: PptElementModel) {
  const cs = props.canvasScale;
  const size = 8 / cs;
  const neg = -size / 2;
  const halfW = (el.width * props.scale) / 2 - size / 2;
  const halfH = (el.height * props.scale) / 2 - size / 2;
  const fullW = el.width * props.scale - size / 2;
  const fullH = el.height * props.scale - size / 2;
  const base = { width: `${size}px`, height: `${size}px` };

  const all: { direction: ResizeDirection; style: CSSProperties }[] = [
    { direction: 'LEFT_TOP', style: { ...base, left: `${neg}px`, top: `${neg}px`, cursor: 'nwse-resize' } },
    { direction: 'TOP', style: { ...base, left: `${halfW}px`, top: `${neg}px`, cursor: 'ns-resize' } },
    { direction: 'RIGHT_TOP', style: { ...base, left: `${fullW}px`, top: `${neg}px`, cursor: 'nesw-resize' } },
    { direction: 'LEFT', style: { ...base, left: `${neg}px`, top: `${halfH}px`, cursor: 'ew-resize' } },
    { direction: 'RIGHT', style: { ...base, left: `${fullW}px`, top: `${halfH}px`, cursor: 'ew-resize' } },
    { direction: 'LEFT_BOTTOM', style: { ...base, left: `${neg}px`, top: `${fullH}px`, cursor: 'nesw-resize' } },
    { direction: 'BOTTOM', style: { ...base, left: `${halfW}px`, top: `${fullH}px`, cursor: 'ns-resize' } },
    { direction: 'RIGHT_BOTTOM', style: { ...base, left: `${fullW}px`, top: `${fullH}px`, cursor: 'nwse-resize' } },
  ];

  // 文本类元素（文本/业务文本）仅支持左右调整宽度
  if (el.type === 'text' || el.type === 'bizText') {
    return all.filter((h) => h.direction === 'LEFT' || h.direction === 'RIGHT');
  }
  return all;
}

function onResizeStart(el: PptElementModel, direction: ResizeDirection, e: MouseEvent) {
  if (props.static) return;
  e.preventDefault();
  resizeContext = {
    element: el,
    direction,
    startX: e.clientX,
    startY: e.clientY,
    origin: { x: el.x, y: el.y, width: el.width, height: el.height },
    alignLines: collectAlignLines((props.slide?.elements ?? []).filter((e) => !e.hidden), props.width, props.height, el.id),
  };
  document.addEventListener('mousemove', onResizeMouseMove);
  document.addEventListener('mouseup', onResizeMouseUp);
}

function onResizeMouseMove(e: MouseEvent) {
  const ctx = resizeContext;
  if (!ctx) return;

  const o = ctx.origin;
  const d = ctx.direction;
  let mx = (e.clientX - ctx.startX) / props.canvasScale;
  let my = (e.clientY - ctx.startY) / props.canvasScale;

  // 角手柄 + Shift：锁定宽高比
  const isCorner = d === 'LEFT_TOP' || d === 'RIGHT_TOP' || d === 'LEFT_BOTTOM' || d === 'RIGHT_BOTTOM';
  if (isCorner && e.shiftKey) {
    const ratio = o.width / o.height;
    if (d === 'RIGHT_BOTTOM' || d === 'LEFT_TOP') my = mx / ratio;
    else my = -mx / ratio;
  }

  // 被拖动边吸附（吸附线已缓存）
  const { h, v } = ctx.alignLines;
  const lines: AlignLineView[] = [];
  if (d.includes('LEFT') || d.includes('RIGHT')) {
    const target = d.includes('LEFT') ? o.x + mx : o.x + o.width + mx;
    const a = adsorb(target, target, v, 'v');
    if (a) {
      mx -= a.offset;
      lines.push(a.line);
    }
  }
  if (d.includes('TOP') || d.includes('BOTTOM')) {
    const target = d.includes('TOP') ? o.y + my : o.y + o.height + my;
    const a = adsorb(target, target, h, 'h');
    if (a) {
      my -= a.offset;
      lines.push(a.line);
    }
  }
  alignLineViews.value = lines;

  const result = computeResize(d, o, mx, my);
  emit('resize-move', { id: ctx.element.id, ...result });
}

function onResizeMouseUp() {
  if (!resizeContext) return;
  resizeContext = null;
  document.removeEventListener('mousemove', onResizeMouseMove);
  document.removeEventListener('mouseup', onResizeMouseUp);
  alignLineViews.value = [];
}

// ==================== 文本编辑与事件 ====================

function onElementDblClick(el: PptElementModel) {
  // 文本类元素（文本/业务文本）双击进入编辑（媒体无内嵌文本，不进编辑）
  if (props.static || (el.type !== 'text' && el.type !== 'bizText')) return;
  emit('edit-text', el);
}

// 元素右键：先选中再抛给编辑器打开上下文菜单
function onElementContextMenu(el: PptElementModel, e: MouseEvent) {
  if (props.static) return;
  emit('select', el);
  emit('element-contextmenu', { element: el, x: e.clientX, y: e.clientY });
}

function onTextCommit(el: PptElementModel, payload: { text: string; height: number }) {
  emit('update-text', { id: el.id, text: payload.text, height: payload.height });
}

// 编辑过程中实时同步（不清理编辑态、不触发空文本删除）
function onTextUpdate(el: PptElementModel, payload: { text: string; height: number }) {
  emit('input-text', { id: el.id, text: payload.text, height: payload.height });
}

// 媒体下拉级联选中：回写 optionPath（完整路径）
function onMediaOption(el: PptElementModel, payload: { optionPath: string }) {
  emit('element-update', { id: el.id, patch: { optionPath: payload.optionPath } });
}

// 表格单元格编辑提交：回写 data（二维数组），经 element-update 写入 store
function onTableCellUpdate(el: PptElementModel, data: PptTableCell[][]) {
  emit('element-update', { id: el.id, patch: { data } });
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDocumentMouseMove);
  document.removeEventListener('mouseup', onDocumentMouseUp);
  document.removeEventListener('mousemove', onResizeMouseMove);
  document.removeEventListener('mouseup', onResizeMouseUp);
});
</script>

<style scoped>
.vpk-canvas {
  position: relative;
  background: #fff;
  overflow: hidden;
  flex-shrink: 0;
}
.vpk-element { position: absolute; }
.vpk-element.interactive { cursor: move; }
.vpk-element.selected { cursor: move; }

.vpk-resize-handle {
  position: absolute;
  z-index: 2;
  background: #fff;
  border: 1px solid var(--vpk-primary, #409eff);
  border-radius: 2px;
  box-sizing: border-box;
}

/* 对齐吸附线：虚线样式（与选中框一致） */
.vpk-align-line {
  position: absolute;
  z-index: 3;
  pointer-events: none;
}
.vpk-align-line.h {
  height: 1px;
  background: repeating-linear-gradient(to right, var(--vpk-primary, #409eff) 0 4px, transparent 4px 8px);
}
.vpk-align-line.v {
  width: 1px;
  background: repeating-linear-gradient(to bottom, var(--vpk-primary, #409eff) 0 4px, transparent 4px 8px);
}
</style>
