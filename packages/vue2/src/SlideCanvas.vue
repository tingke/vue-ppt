<template>
  <div
    class="vpk-canvas"
    :style="{
      width: width * scale + 'px',
      height: height * scale + 'px',
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
          v-if="elementComponentMap[el.type]"
          :is="elementComponentMap[el.type]"
          :element="el"
          :scale="scale"
          :editing="el.id === editingId"
          :static="staticElementTypes.includes(el.type) ? static : undefined"
          @commit="onTextCommit(el, $event)"
          @update="onTextUpdate(el, $event)"
          @option="onMediaOption(el, $event)"
          @cell-update="onTableCellUpdate(el, $event)"
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
import {
  adsorb,
  collectAlignLines,
  computeResize,
  SORPTION_RANGE,
  AlignLineSet,
  AlignLineView,
  PptElementModel,
  PptMediaElement,
  PptTableCell,
  ResizeDirection,
} from '@vue-ppt-kit/core';
import { elementComponentMap } from './elements';

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

interface ResizeContext {
  element: PptElementModel;
  direction: ResizeDirection;
  startX: number;
  startY: number;
  origin: { x: number; y: number; width: number; height: number };
  /** 手柄按下时收集的吸附线缓存 */
  alignLines: AlignLineSet;
}

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
      // 静态渲染透传的元素类型（缩略图等场景组件内不建交互/编辑实例）
      staticElementTypes: ['text', 'bizText', 'media', 'table', 'bizTable'],
    };
  },
  computed: {
    // 供模板动态组件使用（vue2 模板无法直接访问导入绑定）
    elementComponentMap(): typeof elementComponentMap {
      return elementComponentMap;
    },
    // 隐藏元素不渲染（如媒体关联的业务文本经右键隐藏）
    visibleElements(): PptElementModel[] {
      const slide = this.slide as { elements?: PptElementModel[] } | undefined;
      return (slide && slide.elements || []).filter((e: PptElementModel) => !e.hidden);
    },
    // 选中媒体时同步高亮其关联的业务文本（反之不联动）
    selectedLinkedId(): string | undefined {
      const selected = this.visibleElements.find((e: PptElementModel) => e.id === this.selectedId);
      return selected && selected.type === 'media' ? (selected as PptMediaElement).textId : undefined;
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

    // ==================== 对齐吸附（算法在 core/geometry，此处仅做展示与缓存） ====================

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
        alignLines: collectAlignLines((this.slide?.elements || []).filter((e: PptElementModel) => !e.hidden), this.width, this.height, el.id),
        linked: null,
      };
      // 媒体元素：关联业务文本随媒体一起拖动（保持相对位置）
      if (el.type === 'media') {
        const textId = (el as PptMediaElement).textId;
        const linked = textId && (this.slide?.elements || []).find((e: PptElementModel) => e.id === textId);
        if (linked) this.dragContext.linked = { id: linked.id, x: linked.x, y: linked.y };
      }
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
      this.alignLineViews = lines;

      this.$emit('drag-move', { id: ctx.element.id, x, y });
      // 关联业务文本跟随媒体移动（保持相对位置）
      if (ctx.linked) {
        this.$emit('drag-move', { id: ctx.linked.id, x: ctx.linked.x + (x - ctx.originX), y: ctx.linked.y + (y - ctx.originY) });
      }
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

      const all: { direction: ResizeDirection; style: Record<string, string> }[] = [
        { direction: 'LEFT_TOP', style: { ...base, left: neg + 'px', top: neg + 'px', cursor: 'nwse-resize' } },
        { direction: 'TOP', style: { ...base, left: halfW + 'px', top: neg + 'px', cursor: 'ns-resize' } },
        { direction: 'RIGHT_TOP', style: { ...base, left: fullW + 'px', top: neg + 'px', cursor: 'nesw-resize' } },
        { direction: 'LEFT', style: { ...base, left: neg + 'px', top: halfH + 'px', cursor: 'ew-resize' } },
        { direction: 'RIGHT', style: { ...base, left: fullW + 'px', top: halfH + 'px', cursor: 'ew-resize' } },
        { direction: 'LEFT_BOTTOM', style: { ...base, left: neg + 'px', top: fullH + 'px', cursor: 'nesw-resize' } },
        { direction: 'BOTTOM', style: { ...base, left: halfW + 'px', top: fullH + 'px', cursor: 'ns-resize' } },
        { direction: 'RIGHT_BOTTOM', style: { ...base, left: fullW + 'px', top: fullH + 'px', cursor: 'nwse-resize' } },
      ];

      // 文本类元素（文本/业务文本）仅支持左右调整宽度（参考 PPTist textElementResizeHandlers）
      if (el.type === 'text' || el.type === 'bizText') {
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
        alignLines: collectAlignLines((this.slide?.elements || []).filter((e: PptElementModel) => !e.hidden), this.width, this.height, el.id),
      };
      document.addEventListener('mousemove', this.onResizeMouseMove);
      document.addEventListener('mouseup', this.onResizeMouseUp);
    },

    // 按方向计算新位置尺寸的算法在 core computeResize（最小尺寸钳制等语义一致）
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

      // 被拖动边吸附（参考 PPTist useScaleElement 的 alignedAdsorption；吸附线已缓存）
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
      this.alignLineViews = lines;

      const result = computeResize(d, o, mx, my);
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
      // 文本类元素（文本/业务文本）双击进入编辑（媒体无内嵌文本，不进编辑）
      if (this.static || (el.type !== 'text' && el.type !== 'bizText')) return;
      this.$emit('edit-text', el);
    },

    // 元素右键：先选中再抛给编辑器打开上下文菜单（参考 PPTist EditableElement contextmenus）
    onElementContextMenu(el: PptElementModel, e: MouseEvent) {
      if (this.static) return;
      this.$emit('select', el);
      this.$emit('element-contextmenu', { element: el, x: e.clientX, y: e.clientY });
    },

    onTextCommit(el: PptElementModel, payload: { text: string; height: number }) {
      this.$emit('update-text', { id: el.id, text: payload.text, height: payload.height });
    },

    // 编辑过程中实时同步（不清理编辑态、不触发空文本删除）
    onTextUpdate(el: PptElementModel, payload: { text: string; height: number }) {
      this.$emit('input-text', { id: el.id, text: payload.text, height: payload.height });
    },

    // 媒体下拉级联选中：回写 optionPath（完整路径）
    onMediaOption(el: PptElementModel, payload: { optionPath: string }) {
      this.$emit('element-update', { id: el.id, patch: { optionPath: payload.optionPath } });
    },

    // 表格单元格编辑提交：回写 data（二维数组），经 element-update 写入 store
    onTableCellUpdate(el: PptElementModel, data: PptTableCell[][]) {
      this.$emit('element-update', { id: el.id, patch: { data } });
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

/* 对齐吸附线：虚线样式（与选中框一致） */
.vpk-align-line {
  position: absolute;
  z-index: 3;
  pointer-events: none;
}
.vpk-align-line.h {
  height: 1px;
  background: repeating-linear-gradient(to right, #409eff 0 4px, transparent 4px 8px);
}
.vpk-align-line.v {
  width: 1px;
  background: repeating-linear-gradient(to bottom, #409eff 0 4px, transparent 4px 8px);
}
</style>
