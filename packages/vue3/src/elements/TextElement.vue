<template>
  <span :style="textStyle">{{ element.text }}</span>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { PptTextElement } from '@vue-ppt-kit/core';

// 参考 PPTist BaseTextElement：纯静态渲染文本元素
const props = withDefaults(defineProps<{
  element: PptTextElement;
  scale?: number;
}>(), {
  scale: 1,
});

const textStyle = computed<CSSProperties>(() => ({
  fontSize: `${(props.element.fontSize ?? 16) * props.scale}px`,
  color: props.element.color ?? '#303133',
  lineHeight: 1.4,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}));
</script>
