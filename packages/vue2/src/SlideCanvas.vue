<template>
  <div
    class="vpk-canvas"
    :style="{ width: width * scale + 'px', height: height * scale + 'px' }"
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
      >
        <component
          v-if="elementComponentMap[el.type]"
          :is="elementComponentMap[el.type]"
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

<script lang="ts">
import Vue from 'vue';
import { PptElementModel } from '@vue-ppt-kit/core';
import { elementComponentMap } from './elements';

type ResizeDirection =
  | 'LEFT_TOP' | 'TOP' | 'RIGHT_TOP'
  | 'LEFT' | 'RIGHT'
  | 'LEFT_BOTTOM' | 'BOTTOM' | 'RIGHT_BOTTOM';

interface AlignLine { value: number; range: [number, number] }
interface AlignLineView { type: 'h' | 'v'; value: number; range: [number, number] }

interface DragContext {
  element: PptElementModel;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  isMisoperation: boolean | null;
}

interface ResizeContext {
  element: PptElementModel;
  direction: ResizeDirection;
  startX: number;
  startY: number;
  origin: { x: number; y: number; width: number; height: number };
}

const MIN_SIZE = 20;
const SORPTION_RANGE = 5;

export default Vue.extend({
  name: 'SlideCanvas',
  props: {
    slide: { type: Object, default: undefined },
    width: { type: Number, default: 960 },
    height: { type: Number, default: 540 },
    scale: { type: Number, default: 1 },
    static: { type: Boolean, default: false },
    // 画布缩放比例，用于屏幕位移 → 文档坐标换算与手柄尺寸补偿
    canvasScale: { type: Number, default: 1 },
    selectedId: { type: String, default: '' },
    editingId: { type: String, default: '' },
  },
  data() {
    return {
      dragContext: null as DragContext | null,
      resizeContext: null as ResizeContext | null,
      alignLineViews: [] as AlignLineView[],
    };
  },
  computed: {
    // 供模板动态组件使用（vue2 模板无法直接访问导入绑定）
    elementComponentMap(): typeof elementComponentMap {
      return elementComponentMap;
    },
    // 仅选中元素显示虚线框（参考 PPTist Operate 选中层），线宽按画布缩放反向补偿，视觉恒定 1px
    selectedOutline(): Record<string, string> {
      return { outline: 1 / this.canvasScale + 'px dashed var(--vpk-primary, #409eff)' };
    },
  },
  beforeDestroy() {
    document.removeEventListener('mousemove', this.onDocumentMouseMove);
    document.removeEventListener('mouseup', this.onDocumentMouseUp);
    document.removeEventListener('mousemove', this.onResizeMouseMove);
    document.removeEventListener('mouseup', this.onResizeMouseUp);
  },
  methods: {
    // 元素定位（尺寸/位置按 scale 缩放），内容渲染交给 elements/ 下的类型组件
    elementStyle(el: PptElementModel): Record<string, string | undefined> {
      return {
        position: 'absolute',
        left: el.x * this.scale + 'px',
        top: el.y * this.scale + 'px',
        width: el.width * this.scale + 'px',
        height: el.height * this.scale + 'px',
        transform: el.rotation ? 'rotate(' + el.rotation + 'deg)' : undefined,
      };
    },

    // ==================== 对齐吸附 ====================

    collectAlignLines(excludeId: string) {
      const h: AlignLine[] = [];
      const v: AlignLine[] = [];
      const W = this.width;
      const H = this.height;

      for (const el of (this.slide?.elements || []) as PptElementModel[]) {
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
    },

    // 目标范围（min/max/center）与吸附线比较，返回校正量与展示线
    adsorb(targetMin: number, targetMax: number, lines: AlignLine[], type: 'h' | 'v') {
      const center = (targetMin + targetMax) / 2;
      for (const l of lines) {
        if (Math.abs(targetMin - l.value) < SORPTION_RANGE)
          return { offset: targetMin - l.value, line: { type, value: l.value, range: l.range } as AlignLineView };
        if (Math.abs(targetMax - l.value) < SORPTION_RANGE)
          return { offset: targetMax - l.value, line: { type, value: l.value, range: l.range } as AlignLineView };
        if (Math.abs(center - l.value) < SORPTION_RANGE)
          return { offset: center - l.value, line: { type, value: l.value, range: l.range } as AlignLineView };
      }
      return null;
    },

    alignLineStyle(l: AlignLineView): Record<string, string> {
      const s = this.scale;
      return l.type === 'h'
        ? { top: l.value * s + 'px', left: l.range[0] * s + 'px', width: (l.range[1] - l.range[0]) * s + 'px' }
        : { left: l.value * s + 'px', top: l.range[0] * s + 'px', height: (l.range[1] - l.range[0]) * s + 'px' };
    },

    // ==================== 元素拖动 ====================

    onCanvasMouseDown() {
      if (this.static) return;
      this.$emit('select', null);
    },

    onElementMouseDown(el: PptElementModel, e: MouseEvent) {
      if (this.static) return;
      e.preventDefault();
      e.stopPropagation();
      this.$emit('select', el);
      this.dragContext = {
        element: el,
        startX: e.clientX,
        startY: e.clientY,
        originX: el.x,
        originY: el.y,
        isMisoperation: null,
      };
      document.addEventListener('mousemove', this.onDocumentMouseMove);
      document.addEventListener('mouseup', this.onDocumentMouseUp);
    },

    onDocumentMouseMove(e: MouseEvent) {
      const ctx = this.dragContext;
      if (!ctx) return;

      // 误操作判定：首次移动距离过小视为点击，不触发拖动
      if (ctx.isMisoperation !== false) {
        ctx.isMisoperation =
          Math.abs(e.clientX - ctx.startX) < SORPTION_RANGE &&
          Math.abs(e.clientY - ctx.startY) < SORPTION_RANGE;
      }
      if (ctx.isMisoperation) return;

      const moveX = (e.clientX - ctx.startX) / this.canvasScale;
      const moveY = (e.clientY - ctx.startY) / this.canvasScale;

      let x = ctx.originX + moveX;
      let y = ctx.originY + moveY;

      // 吸附：目标位置四边/中心与其他元素及画布对齐
      const { h, v } = this.collectAlignLines(ctx.element.id);
      const lines: AlignLineView[] = [];
      const av = this.adsorb(x, x + ctx.element.width, v, 'v');
      if (av) {
        x -= av.offset;
        lines.push(av.line);
      }
      const ah = this.adsorb(y, y + ctx.element.height, h, 'h');
      if (ah) {
        y -= ah.offset;
        lines.push(ah.line);
      }
      this.alignLineViews = lines;

      this.$emit('drag-move', { id: ctx.element.id, x, y });
    },

    onDocumentMouseUp() {
      if (!this.dragContext) return;
      this.dragContext = null;
      document.removeEventListener('mousemove', this.onDocumentMouseMove);
      document.removeEventListener('mouseup', this.onDocumentMouseUp);
      this.alignLineViews = [];
    },

    // ==================== 缩放手柄 ====================

    resizeHandlers(el: PptElementModel) {
      const size = 8 / this.canvasScale;
      const neg = -size / 2;
      const halfW = (el.width * this.scale) / 2 - size / 2;
      const halfH = (el.height * this.scale) / 2 - size / 2;
      const fullW = el.width * this.scale - size / 2;
      const fullH = el.height * this.scale - size / 2;
      const base = { width: size + 'px', height: size + 'px' };

      const all = [
        { direction: 'LEFT_TOP', style: { ...base, left: neg + 'px', top: neg + 'px', cursor: 'nwse-resize' } },
        { direction: 'TOP', style: { ...base, left: halfW + 'px', top: neg + 'px', cursor: 'ns-resize' } },
        { direction: 'RIGHT_TOP', style: { ...base, left: fullW + 'px', top: neg + 'px', cursor: 'nesw-resize' } },
        { direction: 'LEFT', style: { ...base, left: neg + 'px', top: halfH + 'px', cursor: 'ew-resize' } },
        { direction: 'RIGHT', style: { ...base, left: fullW + 'px', top: halfH + 'px', cursor: 'ew-resize' } },
        { direction: 'LEFT_BOTTOM', style: { ...base, left: neg + 'px', top: fullH + 'px', cursor: 'nesw-resize' } },
        { direction: 'BOTTOM', style: { ...base, left: halfW + 'px', top: fullH + 'px', cursor: 'ns-resize' } },
        { direction: 'RIGHT_BOTTOM', style: { ...base, left: fullW + 'px', top: fullH + 'px', cursor: 'nwse-resize' } },
      ];

      // 文本元素仅支持左右调整宽度（参考 PPTist textElementResizeHandlers）
      if (el.type === 'text') {
        return all.filter((h) => h.direction === 'LEFT' || h.direction === 'RIGHT');
      }
      return all;
    },

    onResizeStart(el: PptElementModel, direction: ResizeDirection, e: MouseEvent) {
      if (this.static) return;
      e.preventDefault();
      this.resizeContext = {
        element: el,
        direction,
        startX: e.clientX,
        startY: e.clientY,
        origin: { x: el.x, y: el.y, width: el.width, height: el.height },
      };
      document.addEventListener('mousemove', this.onResizeMouseMove);
      document.addEventListener('mouseup', this.onResizeMouseUp);
    },

    // 按方向计算新位置尺寸：移动边/角时保持对边（对角）不动，最小尺寸钳制
    computeResize(d: ResizeDirection, o: ResizeContext['origin'], mx: number, my: number) {
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
    },

    onResizeMouseMove(e: MouseEvent) {
      const ctx = this.resizeContext;
      if (!ctx) return;

      const o = ctx.origin;
      const d = ctx.direction;
      let mx = (e.clientX - ctx.startX) / this.canvasScale;
      let my = (e.clientY - ctx.startY) / this.canvasScale;

      // 角手柄 + Shift：锁定宽高比
      const isCorner = d === 'LEFT_TOP' || d === 'RIGHT_TOP' || d === 'LEFT_BOTTOM' || d === 'RIGHT_BOTTOM';
      if (isCorner && e.shiftKey) {
        const ratio = o.width / o.height;
        if (d === 'RIGHT_BOTTOM' || d === 'LEFT_TOP') my = mx / ratio;
        else my = -mx / ratio;
      }

      // 被拖动边吸附
      const { h, v } = this.collectAlignLines(ctx.element.id);
      const lines: AlignLineView[] = [];
      if (d.includes('LEFT') || d.includes('RIGHT')) {
        const target = d.includes('LEFT') ? o.x + mx : o.x + o.width + mx;
        const a = this.adsorb(target, target, v, 'v');
        if (a) {
          mx -= a.offset;
          lines.push(a.line);
        }
      }
      if (d.includes('TOP') || d.includes('BOTTOM')) {
        const target = d.includes('TOP') ? o.y + my : o.y + o.height + my;
        const a = this.adsorb(target, target, h, 'h');
        if (a) {
          my -= a.offset;
          lines.push(a.line);
        }
      }
      this.alignLineViews = lines;

      const result = this.computeResize(d, o, mx, my);
      this.$emit('resize-move', { id: ctx.element.id, ...result });
    },

    onResizeMouseUp() {
      if (!this.resizeContext) return;
      this.resizeContext = null;
      document.removeEventListener('mousemove', this.onResizeMouseMove);
      document.removeEventListener('mouseup', this.onResizeMouseUp);
      this.alignLineViews = [];
    },

    // ==================== 文本编辑与事件 ====================

    onElementDblClick(el: PptElementModel) {
      if (this.static || el.type !== 'text') return;
      this.$emit('edit-text', el);
    },

    onTextCommit(el: PptElementModel, payload: { text: string; height: number }) {
      this.$emit('update-text', { id: el.id, text: payload.text, height: payload.height });
    },

    // 编辑过程中实时同步（不清理编辑态、不触发空文本删除）
    onTextUpdate(el: PptElementModel, payload: { text: string; height: number }) {
      this.$emit('input-text', { id: el.id, text: payload.text, height: payload.height });
    },
  },
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

.vpk-align-line {
  position: absolute;
  z-index: 3;
  background: var(--vpk-primary, #409eff);
  pointer-events: none;
}
.vpk-align-line.h { height: 1px; }
.vpk-align-line.v { width: 1px; }
</style>
