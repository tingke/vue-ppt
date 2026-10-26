<template>
  <!-- 页面缩略图面板（分端壳：vuedraggable@4 各用各的，排序/右键菜单逻辑单源于 shared，P1-3） -->
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
          @click="$emit('select', index)"
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

    <!-- 右键菜单：ContextMenu 单源（自挂 body） -->
    <ContextMenu
      v-if="menu.visible"
      :x="menu.x"
      :y="menu.y"
      :items="menuItems"
      @select="onMenuSelect"
      @close="closeMenu"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vpk/vue-api';
import type { PropType } from '@vpk/vue-api';
import Draggable from 'vuedraggable';
import { getSlideTypeLabel } from '@tthappy/ppt-core';
import type { PptDocumentModel, PptSlideType } from '@tthappy/ppt-core';
import { useSlideContextMenu } from '@vpk/shared/contextMenu';
import type { MenuItem } from '@vpk/shared/contextMenu';
import SlideCanvas from '@vpk/shared/components/SlideCanvas.vue';
import ContextMenu from '@vpk/shared/components/ContextMenu.vue';

export default defineComponent({
  name: 'SlideThumbnails',
  components: { Draggable, SlideCanvas, ContextMenu },
  props: {
    doc: { type: Object as PropType<PptDocumentModel>, required: true },
    slideIndex: { type: Object as PropType<{ value: number }>, required: true },
  },
  emits: ['select', 'create', 'copy', 'remove', 'move', 'type-change'],
  setup(props, { emit }) {
    // vuedraggable@4 经 model-value + item-key 直读 doc.slides，无需本地副本
    const thumbStyle = computed<Record<string, string>>(() => {
      const ratio = props.doc.height / props.doc.width;
      const thumbWidth = 120;
      return { width: thumbWidth + 'px', height: Math.round(thumbWidth * ratio) + 'px' };
    });

    // 缩略图按容器宽度等比缩小画布
    const thumbScale = computed(() => 120 / props.doc.width);

    function fillDigit(n: number): string {
      return String(n).padStart(2, '0');
    }

    // 拖拽排序
    function onDragEnd(eventData: { newIndex?: number; oldIndex?: number }) {
      const newIndex = eventData.newIndex ?? 0;
      const oldIndex = eventData.oldIndex ?? 0;
      if (oldIndex === newIndex) return;
      emit('move', oldIndex, newIndex);
      emit('select', newIndex);
    }

    // 右键菜单（状态与菜单项推导单源）
    const { menu, menuItems, openMenu, closeMenu } = useSlideContextMenu(props.doc, {
      create: () => emit('create'),
      copy: (index) => emit('copy', index),
      remove: (index) => emit('remove', index),
      typeChange: (index, type: PptSlideType) => emit('type-change', index, type),
    });

    function onMenuSelect(item: MenuItem) {
      if (item.handler) item.handler(menu.targetIndex);
      closeMenu();
    }

    return { thumbStyle, thumbScale, fillDigit, onDragEnd, getSlideTypeLabel, menu, menuItems, openMenu, closeMenu, onMenuSelect };
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
