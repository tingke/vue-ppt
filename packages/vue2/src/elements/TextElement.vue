<template>
  <span :style="textStyle">{{ element.text }}</span>
</template>

<script lang="ts">
import Vue from 'vue';
import { PptTextElement } from '@vue-ppt-kit/core';

// 参考 PPTist BaseTextElement：纯静态渲染文本元素
export default Vue.extend({
  name: 'PptTextElement',
  props: {
    element: { type: Object as () => PptTextElement, required: true },
    scale: { type: Number, default: 1 },
  },
  computed: {
    textStyle(): Record<string, string | undefined> {
      const el = this.element;
      return {
        fontSize: (el.fontSize || 16) * this.scale + 'px',
        color: el.color || '#303133',
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      };
    },
  },
});
</script>
