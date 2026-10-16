<template>
  <!-- 静态渲染（缩略图等无交互场景）：占位/已选文案仅文字居中显示 -->
  <div v-if="static" class="vpk-media-view" :style="layoutStyle">
    <div class="vpk-media-image" :style="{ height: imageHeight + 'px' }">
      <img v-if="element.src" :src="element.src" alt="" />
      <div v-else class="vpk-media-placeholder" :class="{ 'has-option': hasOption }" :style="placeholderStyle">{{ placeholderText }}</div>
    </div>
  </div>
  <!-- 交互渲染：点击占位/已选文案弹出级联选择照片（面板水平居中于图片，位于图片下方） -->
  <div v-else class="vpk-media-view" :style="layoutStyle">
    <div class="vpk-media-image" :style="{ height: imageHeight + 'px' }">
      <img v-if="element.src" :src="element.src" alt="" />
      <div v-else class="vpk-media-placeholder" :class="{ 'has-option': hasOption }" :style="placeholderStyle" @mousedown="onImageMouseDown" @click="onImageClick">{{ placeholderText }}</div>
    </div>
    <BizVarPicker
      v-if="dropdownVisible"
      :variables="mediaOptionsTree"
      :anchor="dropdownAnchor"
      @select="onPickOption"
      @close="dropdownVisible = false"
    />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import type { PptBizVariableNode, PptMediaElement } from '@vue-ppt-kit/core';
import { MEDIA_OPTIONS_KEY } from '../emitter';
import BizVarPicker from './BizVarPicker.vue';

// 媒体组件：3:4 图片（src 由业务侧填充）+ 点击图片级联选照片。
// 关联业务文本为独立 bizText 元素（textId），可随意拖动，经媒体右键菜单隐藏/显示
export default Vue.extend({
  name: 'PptMediaElement',
  components: { BizVarPicker },
  inject: {
    // 媒体选项树（PptStage provide）；脱离 PptStage 树单独使用时为空
    mediaOptions: { from: MEDIA_OPTIONS_KEY, default: (): PptBizVariableNode[] => [] },
  },
  props: {
    element: { type: Object as () => PptMediaElement, required: true },
    scale: { type: Number, default: 1 },
    // 静态渲染（缩略图等）：无交互
    static: { type: Boolean, default: false },
  },
  data() {
    return {
      dropdownVisible: false,
      dropdownAnchor: { left: 0, top: 0 },
      // 图片按下位置：click 时判断是否发生过拖动（拖动后的 click 不弹级联）
      downPos: null as { x: number; y: number } | null,
    };
  },
  computed: {
    mediaOptionsTree(): PptBizVariableNode[] {
      return ((this as any).mediaOptions as PptBizVariableNode[]) || [];
    },
    layoutStyle(): Record<string, string | number> {
      return {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
      };
    },
    // 图片区 3:4（按宽），超高时以元素高度封顶
    imageHeight(): number {
      return Math.max(0, Math.min(this.element.width * this.scale * (4 / 3), this.element.height * this.scale));
    },
    // 占位/已选文案：未选照片提示操作，已选显示所选末级名称
    placeholderText(): string {
      return (this.element.optionPath || '').split('/').pop() || '点击选择照片';
    },
    // 已选照片时文案高亮为主题色
    hasOption(): boolean {
      return !!this.element.optionPath;
    },
    // 占位文案字号随画布/缩略图缩放（缩略图 scale 极小，固定字号会显得过大）
    placeholderStyle(): Record<string, string> {
      return { fontSize: 12 * this.scale + 'px' };
    },
  },
  methods: {
    // 记录按下位置（不阻断冒泡：选中 / 拖拽仍由画布处理）
    onImageMouseDown(e: MouseEvent) {
      this.downPos = { x: e.clientX, y: e.clientY };
    },
    // click 判断未拖动（位移小于吸附阈值）才弹出级联，拖动后的 click 忽略
    onImageClick(e: MouseEvent) {
      const down = this.downPos;
      this.downPos = null;
      if (down && (Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4)) return;
      this.toggleDropdown(e);
    },
    // 级联面板：锚定 vpk-media-view 中央（水平中线与垂直中线交点，面板自该点向右下展开）
    toggleDropdown(e: Event) {
      this.dropdownVisible = !this.dropdownVisible;
      if (this.dropdownVisible) {
        const viewEl = (e.currentTarget as HTMLElement).closest('.vpk-media-view') as HTMLElement | null;
        if (!viewEl) return;
        const rect = viewEl.getBoundingClientRect();
        this.dropdownAnchor = { left: rect.left + rect.width / 2, top: rect.top + rect.height / 2 };
      }
    },
    // 级联选中：记录完整路径，图片角标回显末级
    onPickOption(tag: { key: string; label: string }) {
      this.dropdownVisible = false;
      this.$emit('option', { optionPath: tag.key });
    },
  },
});
</script>

<style scoped>
/* 图片区 flex 居中：占位/已选文案（shrink-to-fit）水平垂直居中 */
.vpk-media-image {
  position: relative;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}
.vpk-media-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* 占位/已选文案：仅文字（无底色边框），已选高亮 */
.vpk-media-placeholder {
  color: #c0c4cc;
  cursor: pointer;
}
.vpk-media-placeholder.has-option {
  color: var(--vpk-primary, #409eff);
}
.vpk-media-placeholder:hover {
  color: var(--vpk-primary, #409eff);
}
</style>
