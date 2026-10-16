<template>
  <div class="vpk-thumbnails" @contextmenu.prevent="openMenu($event, 'blank')">
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
          <!-- 页面类型标签：卡片右下角 -->
          <div class="vpk-thumb-type">{{ getSlideTypeLabel(slide.slideType) }}</div>
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
          @mouseenter="onItemMouseEnter(item, i)"
          @mouseleave="closeSubMenu"
          @click="handleItemClick(item, i)"
        >
          <span class="vpk-contextmenu-text">{{ item.text }}</span>
          <span v-if="item.subText" class="vpk-contextmenu-sub">{{ item.subText }}</span>
          <span v-if="hasChildren(item)" class="vpk-contextmenu-arrow">›</span>
          <!-- 二级菜单：切换类型 -->
          <div v-if="menu.subIndex === i && hasChildren(item)" class="vpk-contextmenu vpk-contextmenu-submenu">
            <div
              v-for="(child, j) in item.children"
              :key="j"
              class="vpk-contextmenu-item"
              @click.stop="handleMenuClick(child)"
            >
              <span class="vpk-contextmenu-text">{{ child.text }}</span>
              <span v-if="child.subText" class="vpk-contextmenu-sub">{{ child.subText }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Draggable from 'vuedraggable';
import { getSlideTypeLabel, PptSlideModel, PptSlideType, SLIDE_TYPES } from '@vue-ppt/core';
import SlideCanvas from './SlideCanvas.vue';

interface MenuItem {
  text?: string;
  subText?: string;
  disabled?: boolean;
  handler?: (index: number) => void;
  /** 二级菜单项（如「切换类型」的类型列表） */
  children?: MenuItem[];
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
      menu: { visible: false, x: 0, y: 0, targetIndex: -1, subIndex: -1 } as {
        visible: boolean; x: number; y: number; targetIndex: number; subIndex: number;
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
      // 二级菜单：仅列出当前类型之外的另外 2 种
      const slide = this.doc.slides[index] as PptSlideModel | undefined;
      const typeChildren: MenuItem[] = SLIDE_TYPES
        .filter((t) => t.value !== (slide && slide.slideType || 'custom'))
        .map((t) => ({ text: t.label, handler: (i: number) => this.$emit('type-change', i, t.value as PptSlideType) }));
      const items: MenuItem[] = [
        { text: '新建页面', subText: 'Enter', handler: (i) => this.$emit('create') },
        { text: '复制页面', subText: 'Ctrl + D', handler: (i) => this.$emit('copy', i) },
        { text: '删除页面', subText: 'Delete', disabled: onlyOne, handler: (i) => this.$emit('remove', i) },
        { divider: true },
        { text: '切换类型', children: typeChildren },
      ];
      // 一级与二级菜单项均闭包绑定目标页 index
      return items.map((item) => ({
        ...item,
        handler: item.handler ? () => item.handler!(index) : undefined,
        children: item.children && item.children.length
          ? item.children.map((child) => ({
              ...child,
              handler: child.handler ? () => child.handler!(index) : undefined,
            }))
          : undefined,
      }));
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
    getSlideTypeLabel,
    fillDigit(n: number): string {
      return String(n).padStart(2, '0');
    },
    // 拖拽排序
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
      // 注意不能写 index || -1：第一页 index 为 0 是 falsy，会被误判成空白区域
      this.menu.targetIndex = type === 'item' ? (index ?? -1) : -1;
      this.menu.subIndex = -1;
    },
    closeMenu() {
      this.menu.visible = false;
    },
    hasChildren(item: MenuItem): boolean {
      return !!(item.children && item.children.length);
    },
    // 悬停展开二级菜单（子菜单为条目子元素，移入不会触发 mouseleave）
    onItemMouseEnter(item: MenuItem, i: number) {
      this.menu.subIndex = this.hasChildren(item) ? i : -1;
    },
    closeSubMenu() {
      this.menu.subIndex = -1;
    },
    // 一级项：有子菜单仅切换展开态，否则执行并关闭菜单
    handleItemClick(item: MenuItem, i: number) {
      if (item.disabled) return;
      if (this.hasChildren(item)) {
        this.menu.subIndex = this.menu.subIndex === i ? -1 : i;
        return;
      }
      this.handleMenuClick(item);
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
.vpk-thumb-item.active .vpk-thumb-type { background: var(--vpk-primary, #409eff); }
.vpk-thumb-label {
  width: 20px;
  font-size: 12px;
  color: #999;
  cursor: grab;
  flex-shrink: 0;
}
.vpk-thumb {
  position: relative;
  outline: 1px solid rgba(64, 158, 255, 0.15);
  overflow: hidden;
  flex-shrink: 0;
}
/* 页面类型角标：卡片右下角 */
.vpk-thumb-type {
  position: absolute;
  right: 0;
  bottom: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: 2px 5px;
  font-size: 10px;
  line-height: 1.2;
  color: #fff;
  background: rgba(48, 49, 51, 0.65);
  border-top-left-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
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
  position: relative;
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
.vpk-contextmenu-arrow { font-size: 14px; line-height: 1; color: #909399; }
/* 二级菜单：锚定在一级条目右侧（覆盖 .vpk-contextmenu 的 fixed 定位） */
.vpk-contextmenu-submenu {
  position: absolute;
  left: 100%;
  top: -5px;
  z-index: 1;
  min-width: 160px;
}
.vpk-contextmenu-divider { height: 1px; margin: 4px 0; background: #ebeef5; }
</style>
