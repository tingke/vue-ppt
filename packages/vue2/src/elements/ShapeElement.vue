<template>
  <div :style="shapeStyle" />
</template>

<script lang="ts">
import Vue from 'vue';
import { PptShapeElement } from '@vue-ppt/core';

// 纯静态渲染形状元素
export default Vue.extend({
  name: 'PptShapeElement',
  props: {
    element: { type: Object as () => PptShapeElement, required: true },
  },
  computed: {
    shapeStyle(): Record<string, string | undefined> {
      const el = this.element;
      return {
        width: '100%',
        height: '100%',
        background: el.fill,
        border: el.stroke ? '1px solid ' + el.stroke : undefined,
        borderRadius: el.shape === 'ellipse' ? '50%' : undefined,
      };
    },
  },
});
</script>
