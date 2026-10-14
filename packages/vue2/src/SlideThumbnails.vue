<template>
  <div class="vpk-thumbnails" @contextmenu.prevent="openMenu($event, 'blank')">
    <div class="vpk-add-slide" @click="$emit('create')">
      <span class="vpk-add-icon">+</span>添加幻灯片
    </div>
    <Draggable
      class="vpk-thumb-list"
      :list="localSlides"
      :animation="300"
      :scroll="true"
      :scroll-sensitivity="50"
      :set-data="null"
      @end="onDragEnd"
    >
      <div
        v-for="(slide, index) in localSlides"
        :key="slide.id"
        class="vpk-thumb-item"
        :class="{ active: slideIndex.value === index }"
        @click="$emit('select', index)"
        @contextmenu.prevent.stop="openMenu($event, 'item', index)"
      >
        <div class="vpk-thumb-label">{{ fillDigit(index + 1) }}</div>
        <div class="vpk-thumb" :style="thumbStyle">
          <SlideCanvas class="vpk-thumb-canvas" :slide="slide" :width="doc.width" :height="doc.height" :scale="thumbScale" static />
        </div>
      </div>
    </Draggable>

    <div
      v-if="menu.visible"
      class="vpk-contextmenu"
      :style="{ left: menu.x + 'px', top: menu.y + 'px' }"
    >
      <template v-for="(item, i) in menuItems">
        <div v-if="item.divider" :key="'d' + i" class="vpk-contextmenu-divider" />
        <div
          v-else
          :key="'i' + i"
          class="vpk-contextmenu-item"
          :class="{ disabled: item.disabled }"
          @click="!item.disabled && handleMenuClick(item)"
        >
          <span class="vpk-contextmenu-text">{{ item.text }}</span>
          <span v-if="item.subText" class="vpk-contextmenu-sub">{{ item.subText }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Draggable from 'vuedraggable';
import { PptSlideModel } from '@vue-ppt-kit/core';
import SlideCanvas from './SlideCanvas.vue';

interface MenuItem {
  text?: string;
  subText?: string;
  disabled?: boolean;
  handler?: (index: number) => void;
  divider?: boolean;
}

export default Vue.extend({
  name: 'SlideThumbnails',
  components: { Draggable, SlideCanvas },
  props: {
    doc: { type: Object, required: true },
    slideIndex: { type: Object, required: true },
  },
  data() {
    return {
      // vuedraggable@2 需要 list/model 可变数组，用副本在拖拽结束后同步回父组件
      localSlides: [] as PptSlideModel[],
      menu: { visible: false, x: 0, y: 0, targetIndex: -1 } as {
        visible: boolean; x: number; y: number; targetIndex: number;
      },
    };
  },
  computed: {
    thumbStyle(): Record<string, string> {
      const ratio = this.doc.height / this.doc.width;
      const thumbWidth = 120;
      return { width: thumbWidth + 'px', height: Math.round(thumbWidth * ratio) + 'px' };
    },
    // 缩略图按容器宽度等比缩小画布
    thumbScale(): number {
      return 120 / this.doc.width;
    },
    menuItems(): MenuItem[] {
      if (this.menu.targetIndex < 0) {
        return [{ text: '新建页面', subText: 'Enter', handler: () => this.$emit('create') }];
      }
      const index = this.menu.targetIndex;
      const onlyOne = this.doc.slides.length <= 1;
      const items: MenuItem[] = [
        { text: '复制页面', subText: 'Ctrl + D', handler: (i) => this.$emit('copy', i) },
        { text: '删除页面', subText: 'Delete', disabled: onlyOne, handler: (i) => this.$emit('remove', i) },
        { divider: true },
        { text: '新建页面', subText: 'Enter', handler: () => this.$emit('create') },
      ];
      return items.map((item) =>
        item.handler ? { ...item, handler: () => item.handler!(index) } : item
      );
    },
  },
  watch: {
    'doc.slides': {
      immediate: true,
      handler(slides: PptSlideModel[]) {
        this.localSlides = slides.slice();
      },
    },
  },
  mounted() {
    document.addEventListener('mousedown', this.onGlobalMouseDown);
    document.addEventListener('contextmenu', this.onGlobalContextMenu);
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onGlobalMouseDown);
    document.removeEventListener('contextmenu', this.onGlobalContextMenu);
  },
  methods: {
    fillDigit(n: number): string {
      return String(n).padStart(2, '0');
    },
    // 拖拽排序：参考 PPTist handleDragEnd
    onDragEnd(eventData: { newIndex?: number; oldIndex?: number }) {
      const newIndex = eventData.newIndex || 0;
      const oldIndex = eventData.oldIndex || 0;
      if (oldIndex === newIndex) return;
      this.$emit('move', oldIndex, newIndex);
      this.$emit('select', newIndex);
    },
    openMenu(e: MouseEvent, type: 'item' | 'blank', index?: number) {
      this.menu.visible = true;
      this.menu.x = e.clientX;
      this.menu.y = e.clientY;
      this.menu.targetIndex = type === 'item' ? index || -1 : -1;
    },
    closeMenu() {
      this.menu.visible = false;
    },
    handleMenuClick(item: MenuItem) {
      item.handler?.(this.menu.targetIndex);
      this.closeMenu();
    },
    onGlobalMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.vpk-contextmenu')) this.closeMenu();
    },
    onGlobalContextMenu() {
      this.closeMenu();
    },
  },
});
</script>

<style scoped>
.vpk-thumbnails {
  display: flex;
  flex-direction: column;
  width: 170px;
  flex-shrink: 0;
  border-right: 1px solid var(--vpk-border, #ebeef5);
  background: #fff;
  user-select: none;
}
.vpk-add-slide {
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  border-bottom: 1px solid var(--vpk-border, #ebeef5);
  cursor: pointer;
}
.vpk-add-slide:hover { background: #f5f7fa; }
.vpk-add-icon { font-size: 14px; }
.vpk-thumb-list {
  flex: 1;
  overflow: auto;
  padding: 5px 0;
}
.vpk-thumb-item {
  display: flex;
  align-items: center;
  padding: 5px 0 5px 8px;
  position: relative;
  cursor: pointer;
}
.vpk-thumb-item.active .vpk-thumb { outline-color: var(--vpk-primary, #409eff); }
.vpk-thumb-item.active .vpk-thumb-label { color: var(--vpk-primary, #409eff); }
.vpk-thumb-label {
  width: 20px;
  font-size: 12px;
  color: #999;
  cursor: grab;
  flex-shrink: 0;
}
.vpk-thumb {
  outline: 1px solid rgba(64, 158, 255, 0.15);
  overflow: hidden;
  flex-shrink: 0;
}
.vpk-thumb-canvas {
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>

<style>
.vpk-contextmenu {
  position: fixed;
  z-index: 3000;
  min-width: 180px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  font-size: 13px;
}
.vpk-contextmenu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 6px 12px;
  cursor: pointer;
  color: #303133;
}
.vpk-contextmenu-item:hover { background: #f5f7fa; color: var(--vpk-primary, #409eff); }
.vpk-contextmenu-item.disabled { color: #c0c4cc; cursor: not-allowed; }
.vpk-contextmenu-item.disabled:hover { background: transparent; color: #c0c4cc; }
.vpk-contextmenu-sub { font-size: 12px; color: #909399; }
.vpk-contextmenu-divider { height: 1px; margin: 4px 0; background: #ebeef5; }
</style>
