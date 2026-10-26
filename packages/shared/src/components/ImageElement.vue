<template>
  <!-- 纯静态渲染图片元素（vue2 / vue3 双端共享，P1-3） -->
  <img :src="element.src" :alt="element.alt ?? ''" />
</template>

<script lang="ts">
import { defineComponent } from '@vpk/vue-api';
import type { PropType } from '@vpk/vue-api';
import type { PptImageElement } from '@tthappy/ppt-core';

export default defineComponent({
  name: 'PptImageElement',
  props: {
    element: { type: Object as PropType<PptImageElement>, required: true },
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
