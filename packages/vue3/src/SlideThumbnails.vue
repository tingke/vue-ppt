<template>
  <div class="vpk-thumbnails" @contextmenu.prevent.stop="openMenu($event, 'blank')">
    <Draggable
      class="vpk-thumb-list"
      :model-value="doc.slides"
      :animation="300"
      :scroll="true"
      :scroll-sensitivity="50"
      :set-data="null"
      item-key="id"
      @end="onDragEnd"
    >
      <template #item="{ element, index }">
        <div
          class="vpk-thumb-item"
          :class="{ active: slideIndex.value === index }"
          @click="emit('select', index)"
          @contextmenu.prevent.stop="openMenu($event, 'item', index)"
        >
          <div class="vpk-thumb-label">{{ fillDigit(index + 1) }}</div>
          <div class="vpk-thumb" :style="thumbStyle">
            <SlideCanvas class="vpk-thumb-canvas" :slide="element" :width="doc.width" :height="doc.height" :scale="thumbScale" static />
            <!-- 页面类型标签：卡片右下角 -->
            <div class="vpk-thumb-type">{{ getSlideTypeLabel(element.slideType) }}</div>
          </div>
        </div>
      </template>
    </Draggable>

    <Teleport to="body">
      <div
        v-if="menu.visible"
        class="vpk-contextmenu"
        :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
      >
        <template v-for="(item, i) in menuItems" :key="i">
          <div v-if="'divider' in item" class="vpk-contextmenu-divider" />
          <div
            v-else
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
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from 'vue';
import Draggable from 'vuedraggable';
import { getSlideTypeLabel, SLIDE_TYPES } from '@tthappy/ppt-core';
import type { PptDocumentModel, PptSlideType } from '@tthappy/ppt-core';
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

const props = defineProps<{
  doc: PptDocumentModel;
  slideIndex: { value: number };
}>();

const emit = defineEmits<{
  (e: 'select', index: number): void;
  (e: 'create'): void;
  (e: 'copy', index: number): void;
  (e: 'remove', index: number): void;
  (e: 'move', from: number, to: number): void;
  (e: 'type-change', index: number, type: PptSlideType): void;
}>();

const menu = reactive({ visible: false, x: 0, y: 0, targetIndex: -1, subIndex: -1 });

function fillDigit(n: number) {
  return String(n).padStart(2, '0');
}

// 拖拽排序
function onDragEnd(eventData: { newIndex?: number; oldIndex?: number }) {
  const { newIndex = 0, oldIndex = 0 } = eventData;
  if (oldIndex === newIndex) return;
  emit('move', oldIndex, newIndex);
  emit('select', newIndex);
}

// 右键菜单
const menuItems = computed<MenuItem[]>(() => {
  if (menu.targetIndex < 0) {
    // 空白区域菜单
    return [
      { text: '新建页面', subText: 'Enter', handler: () => emit('create') },
    ];
  }
  const index = menu.targetIndex;
  const onlyOne = props.doc.slides.length <= 1;
  // 二级菜单：仅列出当前类型之外的另外 2 种
  const slide = props.doc.slides[index];
  const typeChildren: MenuItem[] = SLIDE_TYPES
    .filter((t) => t.value !== (slide?.slideType || 'custom'))
    .map((t) => ({ text: t.label, handler: (i: number) => emit('type-change', i, t.value) }));
  const items: MenuItem[] = [
    { text: '新建页面', subText: 'Enter', handler: () => emit('create') },
    { text: '复制页面', subText: 'Ctrl + D', handler: (i: number) => emit('copy', i) },
    { text: '删除页面', subText: 'Delete', disabled: onlyOne, handler: (i: number) => emit('remove', i) },
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
  })) as MenuItem[];
});

function openMenu(e: MouseEvent, type: 'item' | 'blank', index = -1) {
  menu.visible = true;
  menu.x = e.clientX;
  menu.y = e.clientY;
  menu.targetIndex = type === 'item' ? index : -1;
  menu.subIndex = -1;
}

function closeMenu() {
  menu.visible = false;
}

function hasChildren(item: MenuItem): boolean {
  return !!(item.children && item.children.length);
}

// 悬停展开二级菜单（子菜单为条目子元素，移入不会触发 mouseleave）
function onItemMouseEnter(item: MenuItem, i: number) {
  menu.subIndex = hasChildren(item) ? i : -1;
}

function closeSubMenu() {
  menu.subIndex = -1;
}

// 一级项：有子菜单仅切换展开态，否则执行并关闭菜单
function handleItemClick(item: MenuItem, i: number) {
  if (item.disabled) return;
  if (hasChildren(item)) {
    menu.subIndex = menu.subIndex === i ? -1 : i;
    return;
  }
  handleMenuClick(item);
}

function handleMenuClick(item: MenuItem) {
  item.handler?.(menu.targetIndex);
  closeMenu();
}

function onGlobalMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.vpk-contextmenu')) closeMenu();
}

function onGlobalContextMenu() {
  closeMenu();
}

onMounted(() => {
  document.addEventListener('mousedown', onGlobalMouseDown);
  document.addEventListener('contextmenu', onGlobalContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', onGlobalMouseDown);
  document.removeEventListener('contextmenu', onGlobalContextMenu);
});

const thumbStyle = computed(() => {
  const ratio = props.doc.height / props.doc.width;
  const thumbWidth = 120;
  return { width: `${thumbWidth}px`, height: `${Math.round(thumbWidth * ratio)}px` };
});

// 缩略图按容器宽度等比缩小画布
const thumbScale = computed(() => 120 / props.doc.width);
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
