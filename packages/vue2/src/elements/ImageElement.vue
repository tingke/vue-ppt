<template>
  <img :src="element.src" :alt="element.alt || ''" />
</template>

<script lang="ts">
import Vue from 'vue';
import { PptImageElement } from '@vue-ppt-kit/core';

// 参考 PPTist BaseImageElement：纯静态渲染图片元素
export default Vue.extend({
  name: 'PptImageElement',
  props: {
    element: { type: Object as () => PptImageElement, required: true },
  },
});
</script>

<style scoped>
img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
