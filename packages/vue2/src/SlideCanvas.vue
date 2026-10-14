<template>
  <div
    class="vpk-canvas"
    :style="{ width: width * scale + 'px', height: height * scale + 'px' }"
  >
    <template v-if="slide">
      <div
        v-for="el in slide.elements"
        :key="el.id"
        class="vpk-element"
        :style="elementStyle(el)"
      >
        <component
          v-if="elementComponentMap[el.type]"
          :is="elementComponentMap[el.type]"
          :element="el"
          :scale="scale"
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { PptElementModel } from '@vue-ppt-kit/core';
import { elementComponentMap } from './elements';

export default Vue.extend({
  name: 'SlideCanvas',
  props: {
    slide: { type: Object, default: undefined },
    width: { type: Number, default: 960 },
    height: { type: Number, default: 540 },
    scale: { type: Number, default: 1 },
    static: { type: Boolean, default: false },
  },
  computed: {
    // 供模板动态组件使用（vue2 模板无法直接访问导入绑定）
    elementComponentMap(): typeof elementComponentMap {
      return elementComponentMap;
    },
  },
  methods: {
    // 元素定位（尺寸/位置按 scale 缩放），内容渲染交给 elements/ 下的类型组件
    elementStyle(el: PptElementModel): Record<string, string | undefined> {
      return {
        position: 'absolute',
        left: el.x * this.scale + 'px',
        top: el.y * this.scale + 'px',
        width: el.width * this.scale + 'px',
        height: el.height * this.scale + 'px',
        transform: el.rotation ? 'rotate(' + el.rotation + 'deg)' : undefined,
      };
    },
  },
});
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
