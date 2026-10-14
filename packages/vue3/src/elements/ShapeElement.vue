<template>
  <div :style="shapeStyle" />
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { PptShapeElement } from '@vue-ppt-kit/core';

// 参考 PPTist BaseShapeElement：纯静态渲染形状元素
const props = defineProps<{
  element: PptShapeElement;
}>();

const shapeStyle = computed<CSSProperties>(() => ({
  width: '100%',
  height: '100%',
  background: props.element.fill,
  border: props.element.stroke ? `1px solid ${props.element.stroke}` : undefined,
  borderRadius: props.element.shape === 'ellipse' ? '50%' : undefined,
}));
</script>
