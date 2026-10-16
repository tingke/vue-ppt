<template>
  <!-- 画布参考线（横竖各一条虚线，可拖动）：挂在 viewport 内，坐标为文档单位；
       热区与线宽按 canvasScale 反向补偿，保证屏幕上的命中面积与线宽恒定 -->
  <div class="vpk-guides">
    <span
      class="guide h"
      :style="hStyle"
      @pointerdown.stop.prevent="onPointerDown($event, 'y')"
    ></span>
    <span
      class="guide v"
      :style="vStyle"
      @pointerdown.stop.prevent="onPointerDown($event, 'x')"
    ></span>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { clampGuideValue } from '@vue-ppt/core';

// 参考线拖动层：props 单向（位置由编辑器 state 提供），拖动经 update 事件回写
export default Vue.extend({
  name: 'PptGuidesLayer',
  props: {
    // 文档尺寸（拖动范围边界）
    width: { type: Number, default: 960 },
    height: { type: Number, default: 540 },
    // 画布缩放比例（屏幕位移 → 文档坐标换算 / 热区反向补偿）
    canvasScale: { type: Number, default: 1 },
    // 垂直参考线位置（文档坐标）
    x: { type: Number, default: 480 },
    // 水平参考线位置（文档坐标）
    y: { type: Number, default: 270 },
  },
  computed: {
    // 热区 9px / 线宽 1px（屏幕视觉），换算为文档单位
    hit(): number {
      return 9 / this.canvasScale;
    },
    hStyle(): Record<string, string> {
      return {
        top: this.y - this.hit / 2 + 'px',
        height: this.hit + 'px',
        borderTopWidth: 1 / this.canvasScale + 'px',
      };
    },
    vStyle(): Record<string, string> {
      return {
        left: this.x - this.hit / 2 + 'px',
        width: this.hit + 'px',
        borderLeftWidth: 1 / this.canvasScale + 'px',
      };
    },
  },
  methods: {
    // 拖动：优先 pointer capture（移出窗口也能收到 pointerup，不粘滞）；
    // capture 对非活跃 pointerId 会抛 NotFoundError（合成事件等），失败时退回 document 监听。
    // 换算与钳制走 core clampGuideValue（双端一致、可单测）
    onPointerDown(e: PointerEvent, axis: 'x' | 'y') {
      if (e.button !== 0) return;
      const el = e.currentTarget as HTMLElement;
      let captured = false;
      try {
        el.setPointerCapture(e.pointerId);
        captured = true;
      } catch (err) {
        captured = false;
      }
      const target: HTMLElement | Document = captured ? el : document;
      const startClient = axis === 'x' ? e.clientX : e.clientY;
      const startValue = axis === 'x' ? this.x : this.y;
      const max = axis === 'x' ? this.width : this.height;
      const self = this;
      const onMove = (ev: PointerEvent) => {
        const delta = axis === 'x' ? ev.clientX - startClient : ev.clientY - startClient;
        self.$emit('update', { axis, value: clampGuideValue(startValue, delta, self.canvasScale, max) });
      };
      // Document 分支的监听签名是 EventListener，统一转型（挂载与移除同一引用）
      const moveListener = onMove as EventListener;
      const onUp = () => {
        target.removeEventListener('pointermove', moveListener);
        target.removeEventListener('pointerup', upListener);
        target.removeEventListener('pointercancel', upListener);
      };
      const upListener = onUp as EventListener;
      target.addEventListener('pointermove', moveListener);
      target.addEventListener('pointerup', upListener);
      target.addEventListener('pointercancel', upListener);
    },
  },
});
</script>

<style scoped>
/* 容器不拦截事件，仅参考线本体可拖 */
.vpk-guides {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
}
.guide {
  position: absolute;
  pointer-events: auto;
  border-color: #bfbfbf;
  box-sizing: border-box;
  touch-action: none;
}
/* 线画在热区中线：尺寸与线宽由内联样式按缩放补偿 */
.guide.h {
  left: 0;
  right: 0;
  border-top-style: dashed;
  cursor: row-resize;
}
.guide.v {
  top: 0;
  bottom: 0;
  border-left-style: dashed;
  cursor: col-resize;
}
</style>
