<template>
  <!-- 纯静态渲染形状元素（vue2 / vue3 双端共享，P1-3） -->
  <div :style="shapeStyle" />
</template>

<script lang="ts">
import { computed, defineComponent } from '@vpk/vue-api';
import type { PropType } from '@vpk/vue-api';
import type { PptShapeElement } from '@tthappy/ppt-core';

export default defineComponent({
  name: 'PptShapeElement',
  props: {
    element: { type: Object as PropType<PptShapeElement>, required: true },
  },
  setup(props) {
    // 样式用宽松 Record 类型：CSSProperties 为 vue3 类型面，vue2 端不具备
    const shapeStyle = computed<Record<string, string | undefined>>(() => ({
      width: '100%',
      height: '100%',
      background: props.element.fill,
      border: props.element.stroke ? `1px solid ${props.element.stroke}` : undefined,
      borderRadius: props.element.shape === 'ellipse' ? '50%' : undefined,
    }));
    return { shapeStyle };
  },
});
</script>
