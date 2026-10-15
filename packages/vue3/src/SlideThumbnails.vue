<template>
  <div class="vpk-thumbnails" @contextmenu.prevent.stop="openMenu($event, 'blank')">
    <div class="vpk-add-slide" @click="emit('create')">
      <span class="vpk-add-icon">+</span>添加幻灯片
    </div>
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
            @click="!item.disabled && handleMenuClick(item)"
          >
            <span class="vpk-contextmenu-text">{{ item.text }}</span>
            <span v-if="item.subText" class="vpk-contextmenu-sub">{{ item.subText }}</span>
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from 'vue';
import Draggable from 'vuedraggable';
import type { PptDocumentModel } from '@vue-ppt-kit/core';
import SlideCanvas from './SlideCanvas.vue';

interface MenuItem {
  text?: string;
  subText?: string;
  disabled?: boolean;
  handler?: (index: number) => void;
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
}>();

const menu = reactive({ visible: false, x: 0, y: 0, targetIndex: -1 });

function fillDigit(n: number) {
  return String(n).padStart(2, '0');
}

// 拖拽排序：参考 PPTist handleDragEnd
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
  const items: MenuItem[] = [
    { text: '新建页面', subText: 'Enter', handler: () => emit('create') },
    { text: '复制页面', subText: 'Ctrl + D', handler: (i: number) => emit('copy', i) },
    { text: '删除页面', subText: 'Delete', disabled: onlyOne, handler: (i: number) => emit('remove', i) },
  ];
  return items.map((item) => ({ ...item, handler: item.handler ? () => item.handler!(index) : undefined })) as MenuItem[];
});

function openMenu(e: MouseEvent, type: 'item' | 'blank', index = -1) {
  menu.visible = true;
  menu.x = e.clientX;
  menu.y = e.clientY;
  menu.targetIndex = type === 'item' ? index : -1;
}

function closeMenu() {
  menu.visible = false;
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
