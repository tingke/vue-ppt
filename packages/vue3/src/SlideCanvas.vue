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
        v-for="el in slide.elements"
        :key="el.id"
        class="vpk-element"
        :class="{ interactive: !static, selected: el.id === selectedId }"
        :style="[elementStyle(el), el.id === selectedId ? selectedOutline : null]"
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
          @commit="onTextCommit(el, $event)"
          @update="onTextUpdate(el, $event)"
        />

        <!-- 选中缩放手柄（参考 PPTist Operate 层；文本元素仅左右两点） -->
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

      <!-- 对齐吸附线（参考 PPTist AlignmentLine） -->
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
import type { PptSlideModel, PptElementModel } from '@vue-ppt-kit/core';
import { elementComponentMap } from './elements';

type ResizeDirection =
  | 'LEFT_TOP' | 'TOP' | 'RIGHT_TOP'
  | 'LEFT' | 'RIGHT'
  | 'LEFT_BOTTOM' | 'BOTTOM' | 'RIGHT_BOTTOM';

interface AlignLine { value: number; range: [number, number] }
interface AlignLineView { type: 'h' | 'v'; value: number; range: [number, number] }

const MIN_SIZE = 20;
const SORPTION_RANGE = 5;

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

// 仅选中元素显示虚线框（参考 PPTist Operate 选中层），线宽按画布缩放反向补偿，视觉恒定 1px
const selectedOutline = computed(() => ({
  outline: `${1 / props.canvasScale}px dashed var(--vpk-primary, #409eff)`,
}));

// ==================== 对齐吸附（参考 PPTist useDragElement/useScaleElement） ====================

const alignLineViews = ref<AlignLineView[]>([]);

function collectAlignLines(excludeId: string) {
  const h: AlignLine[] = [];
  const v: AlignLine[] = [];
  const W = props.width;
  const H = props.height;

  for (const el of props.slide?.elements ?? []) {
    if (el.id === excludeId) continue;
    const l = el.x;
    const t = el.y;
    const r = el.x + el.width;
    const b = el.y + el.height;
    h.push({ value: t, range: [l, r] }, { value: b, range: [l, r] }, { value: t + el.height / 2, range: [l, r] });
    v.push({ value: l, range: [t, b] }, { value: r, range: [t, b] }, { value: l + el.width / 2, range: [t, b] });
  }

  // 画布边界与中心
  h.push({ value: 0, range: [0, W] }, { value: H, range: [0, W] }, { value: H / 2, range: [0, W] });
  v.push({ value: 0, range: [0, H] }, { value: W, range: [0, H] }, { value: W / 2, range: [0, H] });

  return { h, v };
}

// 目标范围（min/max/center）与吸附线比较，返回校正量与展示线
function adsorb(
  targetMin: number,
  targetMax: number,
  lines: AlignLine[],
  type: 'h' | 'v'
): { offset: number; line: AlignLineView } | null {
  const center = (targetMin + targetMax) / 2;
  for (const l of lines) {
    if (Math.abs(targetMin - l.value) < SORPTION_RANGE)
      return { offset: targetMin - l.value, line: { type, value: l.value, range: l.range } };
    if (Math.abs(targetMax - l.value) < SORPTION_RANGE)
      return { offset: targetMax - l.value, line: { type, value: l.value, range: l.range } };
    if (Math.abs(center - l.value) < SORPTION_RANGE)
      return { offset: center - l.value, line: { type, value: l.value, range: l.range } };
  }
  return null;
}

function alignLineStyle(l: AlignLineView): CSSProperties {
  const s = props.scale;
  return l.type === 'h'
    ? { top: `${l.value * s}px`, left: `${l.range[0] * s}px`, width: `${(l.range[1] - l.range[0]) * s}px` }
    : { left: `${l.value * s}px`, top: `${l.range[0] * s}px`, height: `${(l.range[1] - l.range[0]) * s}px` };
}

// ==================== 元素拖动 ====================

// 参考 PPTist useDragElement：mousedown 起始、document 级跟踪、误操作判定、吸附校正
interface DragContext {
  element: PptElementModel;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  isMisoperation: boolean | null;
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
  };
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

  // 吸附：目标位置四边/中心与其他元素及画布对齐
  const { h, v } = collectAlignLines(ctx.element.id);
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
}

function onDocumentMouseUp() {
  if (!dragContext) return;
  const el = dragContext.element;
  dragContext = null;
  document.removeEventListener('mousemove', onDocumentMouseMove);
  document.removeEventListener('mouseup', onDocumentMouseUp);
  alignLineViews.value = [];
}

// ==================== 缩放手柄（参考 PPTist Operate/ResizeHandler + useScaleElement） ====================

interface ResizeContext {
  element: PptElementModel;
  direction: ResizeDirection;
  startX: number;
  startY: number;
  origin: { x: number; y: number; width: number; height: number };
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

  // 文本元素仅支持左右调整宽度（参考 PPTist textElementResizeHandlers）
  if (el.type === 'text') {
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
  };
  document.addEventListener('mousemove', onResizeMouseMove);
  document.addEventListener('mouseup', onResizeMouseUp);
}

// 按方向计算新位置尺寸：移动边/角时保持对边（对角）不动，最小尺寸钳制
function computeResize(
  d: ResizeDirection,
  o: ResizeContext['origin'],
  mx: number,
  my: number
) {
  let width = o.width;
  let height = o.height;

  if (d === 'RIGHT_BOTTOM') { width = o.width + mx; height = o.height + my; }
  else if (d === 'LEFT_BOTTOM') { width = o.width - mx; height = o.height + my; }
  else if (d === 'LEFT_TOP') { width = o.width - mx; height = o.height - my; }
  else if (d === 'RIGHT_TOP') { width = o.width + mx; height = o.height - my; }
  else if (d === 'LEFT') width = o.width - mx;
  else if (d === 'RIGHT') width = o.width + mx;
  else if (d === 'TOP') height = o.height - my;
  else if (d === 'BOTTOM') height = o.height + my;

  width = Math.max(MIN_SIZE, Math.round(width));
  height = Math.max(MIN_SIZE, Math.round(height));

  let x = o.x;
  let y = o.y;
  if (d === 'LEFT' || d === 'LEFT_TOP' || d === 'LEFT_BOTTOM') x = o.x - (width - o.width);
  if (d === 'TOP' || d === 'LEFT_TOP' || d === 'RIGHT_TOP') y = o.y - (height - o.height);

  return { x, y, width, height };
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

  // 被拖动边吸附（参考 PPTist useScaleElement 的 alignedAdsorption）
  const { h, v } = collectAlignLines(ctx.element.id);
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
  if (props.static || el.type !== 'text') return;
  emit('edit-text', el);
}

// 元素右键：先选中再抛给编辑器打开上下文菜单（参考 PPTist EditableElement contextmenus）
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
