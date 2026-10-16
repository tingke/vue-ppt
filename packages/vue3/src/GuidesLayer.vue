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

<script setup lang="ts">
import { computed } from 'vue';
import { clampGuideValue } from '@tthappy/ppt-core';

const props = withDefaults(defineProps<{
  /** 文档尺寸（拖动范围边界） */
  width?: number;
  height?: number;
  /** 画布缩放比例（屏幕位移 → 文档坐标换算 / 热区反向补偿） */
  canvasScale?: number;
  /** 垂直参考线位置（文档坐标） */
  x?: number;
  /** 水平参考线位置（文档坐标） */
  y?: number;
}>(), {
  width: 960,
  height: 540,
  canvasScale: 1,
  x: 480,
  y: 270,
});

const emit = defineEmits<{
  (e: 'update', payload: { axis: 'x' | 'y'; value: number }): void;
}>();

// 热区 9px / 线宽 1px（屏幕视觉），换算为文档单位
const hit = computed(() => 9 / props.canvasScale);
const line = computed(() => 1 / props.canvasScale);

const hStyle = computed(() => ({
  top: `${props.y - hit.value / 2}px`,
  height: `${hit.value}px`,
  borderTopWidth: `${line.value}px`,
}));
const vStyle = computed(() => ({
  left: `${props.x - hit.value / 2}px`,
  width: `${hit.value}px`,
  borderLeftWidth: `${line.value}px`,
}));

// 拖动：优先 pointer capture（移出窗口也能收到 pointerup，不粘滞）；
// capture 对非活跃 pointerId 会抛 NotFoundError（合成事件等），失败时退回 document 监听。
// 换算与钳制走 core clampGuideValue（双端一致、可单测）
function onPointerDown(e: PointerEvent, axis: 'x' | 'y') {
  if (e.button !== 0) return;
  const el = e.currentTarget as HTMLElement;
  let captured = false;
  try {
    el.setPointerCapture(e.pointerId);
    captured = true;
  } catch {
    captured = false;
  }
  const target: HTMLElement | Document = captured ? el : document;
  const startClient = axis === 'x' ? e.clientX : e.clientY;
  const startValue = axis === 'x' ? props.x : props.y;
  const max = axis === 'x' ? props.width : props.height;
  const onMove = (ev: PointerEvent) => {
    const delta = axis === 'x' ? ev.clientX - startClient : ev.clientY - startClient;
    emit('update', { axis, value: clampGuideValue(startValue, delta, props.canvasScale, max) });
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
}
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
