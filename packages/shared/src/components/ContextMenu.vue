<template>
  <!-- 通用右键菜单（vue2 / vue3 双端共享，P1-3：无 Teleport，手动 document.body.appendChild + 卸载摘除）；
       分隔线 / 禁用态 / 二级菜单（悬停或点击展开）均由本组件内部处理，
       叶子项点击经 select 抛给调用方执行业务并关闭（close 事件驱动 v-if 卸载） -->
  <div ref="menuRef" class="vpk-contextmenu" :style="{ left: x + 'px', top: y + 'px' }">
    <!-- key 置于子节点（vue2 模板约束；vue3 编译器同样接受） -->
    <template v-for="(item, i) in items">
      <div v-if="item.divider" :key="'d' + i" class="vpk-contextmenu-divider" />
      <div
        v-else
        :key="'i' + i"
        class="vpk-contextmenu-item"
        :class="{ disabled: item.disabled }"
        @mouseenter="onItemMouseEnter(item, i)"
        @mouseleave="closeSubMenu"
        @click="onItemClick(item, i)"
      >
        <span class="vpk-contextmenu-text">{{ item.text }}</span>
        <span v-if="item.subText" class="vpk-contextmenu-sub">{{ item.subText }}</span>
        <span v-if="hasChildren(item)" class="vpk-contextmenu-arrow">›</span>
        <!-- 二级菜单：锚定在一级条目右侧 -->
        <div v-if="subIndex === i && hasChildren(item)" class="vpk-contextmenu vpk-contextmenu-submenu">
          <div
            v-for="(child, j) in item.children"
            :key="j"
            class="vpk-contextmenu-item"
            @click.stop="onChildClick(child)"
          >
            <span class="vpk-contextmenu-text">{{ child.text }}</span>
            <span v-if="child.subText" class="vpk-contextmenu-sub">{{ child.subText }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted, ref } from '@vpk/vue-api';
import type { PropType } from '@vpk/vue-api';
import type { MenuItem } from '../contextMenu';

export default defineComponent({
  name: 'PptContextMenu',
  props: {
    /** 视口坐标（contextmenu 事件的 clientX/Y） */
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    items: { type: Array as PropType<MenuItem[]>, required: true },
  },
  emits: ['select', 'close'],
  setup(props, { emit }) {
    const menuRef = ref<HTMLElement | null>(null);
    // 当前展开二级菜单的一级项下标（-1 为收起）
    const subIndex = ref(-1);

    function hasChildren(item: MenuItem): boolean {
      return !!(item.children && item.children.length);
    }

    // 悬停展开二级菜单（子菜单为条目子元素，移入不会触发 mouseleave）
    function onItemMouseEnter(item: MenuItem, i: number) {
      subIndex.value = hasChildren(item) ? i : -1;
    }

    function closeSubMenu() {
      subIndex.value = -1;
    }

    // 一级项：有子菜单仅切换展开态，否则抛给调用方执行
    function onItemClick(item: MenuItem, i: number) {
      if (item.disabled) return;
      if (hasChildren(item)) {
        subIndex.value = subIndex.value === i ? -1 : i;
        return;
      }
      emit('select', item);
    }

    function onChildClick(child: MenuItem) {
      if (child.disabled) return;
      emit('select', child);
    }

    // 点击菜单外关闭（编辑器画布元素 mousedown 有 stopPropagation，故用捕获阶段监听）
    function onGlobalMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.vpk-contextmenu')) emit('close');
    }

    // 任意其他右键打开时关闭本菜单
    function onGlobalContextMenu() {
      emit('close');
    }

    onMounted(() => {
      // 挂到 body：避免被画布 / 缩略图面板的 overflow:hidden 裁剪（Vue 2 无 Teleport，手动搬移 DOM）
      const el = menuRef.value;
      if (el) document.body.appendChild(el);
      document.addEventListener('mousedown', onGlobalMouseDown, true);
      document.addEventListener('contextmenu', onGlobalContextMenu);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onGlobalMouseDown, true);
      document.removeEventListener('contextmenu', onGlobalContextMenu);
      const el = menuRef.value;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });

    return { menuRef, subIndex, hasChildren, onItemMouseEnter, closeSubMenu, onItemClick, onChildClick };
  },
});
</script>

<style scoped>
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
