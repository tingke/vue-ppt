<template>
  <div
    class="vpk-canvas"
    :class="{ static }"
    :style="{ width: `${width * scale}px`, height: `${height * scale}px` }"
  >
    <template v-if="slide">
      <div
        v-for="el in slide.elements"
        :key="el.id"
        class="vpk-element"
        :style="elementStyle(el)"
      >
        <component
          :is="elementComponentMap[el.type]"
          v-if="elementComponentMap[el.type]"
          :element="el"
          :scale="scale"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';
import type { PptSlideModel, PptElementModel } from '@vue-ppt-kit/core';
import { elementComponentMap } from './elements';

const props = withDefaults(defineProps<{
  slide?: PptSlideModel;
  width?: number;
  height?: number;
  scale?: number;
  static?: boolean;
}>(), {
  slide: undefined,
  width: 960,
  height: 540,
  scale: 1,
  static: false,
});

// 元素定位（尺寸/位置按 scale 缩放），内容渲染交给 elements/ 下的类型组件
function elementStyle(el: PptElementModel): CSSProperties {
  return {
    position: 'absolute',
    left: `${el.x * props.scale}px`,
    top: `${el.y * props.scale}px`,
    width: `${el.width * props.scale}px`,
    height: `${el.height * props.scale}px`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
  };
}
</script>

<style scoped>
.vpk-canvas {
  position: relative;
  background: #fff;
  overflow: hidden;
  flex-shrink: 0;
}
.vpk-element { position: absolute; }
</style>
