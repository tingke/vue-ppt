<template>
  <img :src="element.src" :alt="element.alt ?? ''" />
</template>

<script setup lang="ts">
import type { PptImageElement } from '@vue-ppt-kit/core';

// 参考 PPTist BaseImageElement：纯静态渲染图片元素
defineProps<{
  element: PptImageElement;
}>();
</script>

<style scoped>
img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
