<template>
  <!-- 画布标尺：刻度按文档实际尺寸计算并绝对定位，读数与文档坐标一致
       （vue2 / vue3 双端共享，P1-3：普通 defineComponent + setup()，模板/样式由各端 vue 插件按端编译） -->
  <div class="vpk-ruler">
    <div class="h" :style="{ width: viewportStyles.width * canvasScale + 'px', left: viewportStyles.left + 'px' }">
      <!-- 主刻度：竖线在 值 x 缩放比 处，数字右对齐止于刻度线前 -->
      <span
        v-for="v in hTicks.values"
        :key="'h-' + v"
        class="label"
        :class="{ hide: hStepPx < 36 }"
        :style="{ left: v * canvasScale + 'px' }"
      >{{ v }}</span>
      <i
        v-for="v in hTicks.values"
        :key="'ht-' + v"
        class="tick major"
        :style="{ left: v * canvasScale + 'px' }"
      />
      <!-- 中点小刻度（步长像素充足时才显示） -->
      <i
        v-for="v in hMidTicks"
        :key="'hm-' + v"
        class="tick minor"
        :style="{ left: v * canvasScale + 'px' }"
      />
    </div>
    <div class="v" :style="{ height: viewportStyles.height * canvasScale + 'px', top: viewportStyles.top + 'px' }">
      <span
        v-for="v in vTicks.values"
        :key="'v-' + v"
        class="label"
        :class="{ hide: vStepPx < 36 }"
        :style="{ top: v * canvasScale + 'px' }"
      >{{ v }}</span>
      <i
        v-for="v in vTicks.values"
        :key="'vt-' + v"
        class="tick major"
        :style="{ top: v * canvasScale + 'px' }"
      />
      <i
        v-for="v in vMidTicks"
        :key="'vm-' + v"
        class="tick minor"
        :style="{ top: v * canvasScale + 'px' }"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vpk/vue-api';
import type { PropType } from '@vpk/vue-api';
import { computeRulerTicks } from '@tthappy/ppt-core';

export default defineComponent({
  name: 'PptRuler',
  props: {
    /** viewport 在画布容器内的位置与文档尺寸（px） */
    viewportStyles: { type: Object as PropType<{ top: number; left: number; width: number; height: number }>, required: true },
    /** 画布缩放比例 */
    canvasScale: { type: Number, default: 1 },
  },
  setup(props) {
    const hTicks = computed(() => computeRulerTicks(props.viewportStyles.width));
    const vTicks = computed(() => computeRulerTicks(props.viewportStyles.height));
    // 刻度密度随缩放自适应：步长像素（step x canvasScale）< 36 时隐藏数字、< 72 时隐藏中点刻度
    const hStepPx = computed(() => hTicks.value.step * props.canvasScale);
    const vStepPx = computed(() => vTicks.value.step * props.canvasScale);

    // 中点小刻度：相邻主刻度之间（0 与首个主刻度之间也有）
    const hMidTicks = computed(() => (hStepPx.value >= 72 ? hTicks.value.values.map((v) => v - hTicks.value.step / 2) : []));
    const vMidTicks = computed(() => (vStepPx.value >= 72 ? vTicks.value.values.map((v) => v - vTicks.value.step / 2) : []));

    return { hTicks, vTicks, hStepPx, vStepPx, hMidTicks, vMidTicks };
  },
});
</script>

<style scoped>
.vpk-ruler {
  font-size: 12px;
  color: #666;
  user-select: none;
}
.h,
.v {
  position: absolute;
  z-index: 30;
  background: #fff;
  border: 1px solid var(--vpk-border, #ebeef5);
  box-sizing: border-box;
}
.h {
  top: 5px;
  height: 20px;
}
.v {
  left: 5px;
  width: 20px;
  overflow: hidden;
}
/* 主刻度线（12px）与中点小刻度（8px），落在容器内对应位置 */
.tick {
  position: absolute;
  background: #999;
}
.h .tick {
  width: 0.1px;
  bottom: 0;
}
.h .tick.major {
  height: 12px;
}
.h .tick.minor {
  height: 8px;
}
.v .tick {
  height: 0.1px;
  right: 0;
}
.v .tick.major {
  width: 12px;
}
.v .tick.minor {
  width: 8px;
}
/* 数字右对齐 / 下对齐止于刻度线前 */
.label {
  position: absolute;
  line-height: 1;
  white-space: nowrap;
}
.label.hide {
  display: none;
}
.h .label {
  top: 3px;
  padding-right: 4px;
  transform: translateX(-100%);
}
.v .label {
  left: 3px;
  padding-top: 3px;
  transform: translateY(-100%);
  writing-mode: vertical-rl;
}
</style>
