<template>
  <!-- fx 变量选择面板（图 1/图 2）：顶部搜索 + 多列级联；
       挂到 body（画布 transform:scale 会让 fixed 相对缩放容器定位导致跑偏）；
       面板宽度随列数增长，右缘将超出视口时面板自身向左移动（updatePanelLeft）
       （vue2 / vue3 双端共享，P1-3：无 Teleport，手动 document.body.appendChild + 卸载摘除） -->
  <div ref="panelRef" class="vpk-biz-var-picker" :style="{ left: panelLeft + 'px', top: anchor.top + 'px' }">
    <div class="vpk-biz-var-search">
      <input v-model="keyword" type="text" placeholder="搜索变量" />
    </div>
    <div class="vpk-biz-var-body">
      <!-- 级联列：悬停/点击分组展开下一列，列固定宽 -->
      <template v-if="!keyword">
        <div v-for="(col, level) in columns" :key="level" class="vpk-biz-var-col">
          <div
            v-for="(node, idx) in col"
            :key="idx"
            class="vpk-biz-var-item"
            :class="{ active: expanded[level] === idx }"
            @mouseenter="onHover(node, level, idx)"
            @click="onItemClick(node, level, idx)"
          >
            <span class="vpk-biz-var-text">
              {{ node.label }}<span v-if="node.description" class="vpk-biz-var-desc">（{{ node.description }}）</span>
            </span>
            <span v-if="hasChildren(node)" class="vpk-biz-var-extra">
              <span class="vpk-biz-var-count">{{ childCount(node) }}</span>
              <span class="vpk-biz-var-arrow">›</span>
            </span>
          </div>
        </div>
      </template>
      <!-- 搜索结果：平铺匹配叶子，附路径提示 -->
      <div v-else class="vpk-biz-var-col">
        <div v-for="(item, idx) in searchResults" :key="idx" class="vpk-biz-var-item" @click="pick(item.node, item.path)">
          <span class="vpk-biz-var-text">{{ item.node.label }}</span>
          <span class="vpk-biz-var-desc">{{ pathText(item.path) }}</span>
        </div>
        <div v-if="!searchResults.length" class="vpk-biz-var-empty">无匹配变量</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from '@vpk/vue-api';
import type { PropType } from '@vpk/vue-api';
import type { PptBizVariableNode } from '@tthappy/ppt-core';

// 搜索结果条目（导出：setup 返回类型会进入组件公开类型，声明 emit 需要非私有名称）
export interface FlatItem {
  node: PptBizVariableNode;
  path: PptBizVariableNode[];
}

// 业务变量级联选择器：叶子点击后 emit select（key 为「/」分隔的路径，label 为叶子文字）
export default defineComponent({
  name: 'PptBizVarPicker',
  props: {
    variables: { type: Array as PropType<PptBizVariableNode[]>, required: true },
    /** 锚点：fx 按钮左下角（视口坐标）；面板实测宽度后据此自收敛 left */
    anchor: { type: Object as PropType<{ left: number; top: number }>, required: true },
  },
  emits: ['select', 'close'],
  setup(props, { emit }) {
    const keyword = ref('');
    // 每级展开的分支下标（expanded[i] = 第 i 列展开项），columns 据此推导级联列
    const expanded = ref<number[]>([]);
    // 面板根节点（挂 body）：宽度随列数增长，右缘将溢出视口时整体左移
    const panelRef = ref<HTMLElement | null>(null);
    const panelLeft = ref(0);

    // 面板左缘收敛：按面板实测宽度计算，超出多少移多少（面板自身移动，非滚动条）
    function measurePanelLeft() {
      const el = panelRef.value;
      if (!el || !el.offsetWidth) return;
      panelLeft.value = Math.max(8, Math.min(props.anchor.left, window.innerWidth - el.offsetWidth - 8));
    }

    // 列变化 / 挂载后 DOM 尚未稳定的路径经 nextTick 再测量
    function updatePanelLeft() {
      nextTick(measurePanelLeft);
    }

    // 级联列推导：从根列起，逐级取已展开分支的 children
    const columns = computed<PptBizVariableNode[][]>(() => {
      const cols: PptBizVariableNode[][] = [props.variables];
      expanded.value.forEach((idx, level) => {
        const col = cols[level];
        const node = col && col[idx];
        if (node && node.children && node.children.length) cols.push(node.children);
      });
      return cols;
    });

    // 树拍平：叶子 + 祖先链（搜索用）
    const flatLeaves = computed<FlatItem[]>(() => {
      const out: FlatItem[] = [];
      const walk = (nodes: PptBizVariableNode[], path: PptBizVariableNode[]) => {
        nodes.forEach((node) => {
          if (hasChildren(node)) walk(node.children as PptBizVariableNode[], path.concat(node));
          else out.push({ node, path });
        });
      };
      walk(props.variables, []);
      return out;
    });

    const searchResults = computed<FlatItem[]>(() => {
      const kw = keyword.value.trim().toLowerCase();
      if (!kw) return [];
      return flatLeaves.value.filter((item) => item.node.label.toLowerCase().includes(kw));
    });

    function hasChildren(node: PptBizVariableNode): boolean {
      return !!(node.children && node.children.length);
    }

    // 子节点数（vue2 模板不支持 TS 非空断言，经方法收窄）
    function childCount(node: PptBizVariableNode): number {
      return (node.children || []).length;
    }

    // 悬停即展开（级联交互）；点击分支同样展开
    function onHover(node: PptBizVariableNode, level: number, idx: number) {
      if (hasChildren(node)) expand(level, idx);
    }

    function expand(level: number, idx: number) {
      if (expanded.value[level] === idx) return;
      // 截断至该列：后续列随 columns 计算属性自动收窄
      const next = expanded.value.slice(0, level);
      next[level] = idx;
      expanded.value = next;
      // 列变化后面板宽度改变：按实测宽度重新收敛 left
      updatePanelLeft();
    }

    function onItemClick(node: PptBizVariableNode, level: number, idx: number) {
      if (hasChildren(node)) {
        expand(level, idx);
        return;
      }
      pick(node, ancestorPath(level).concat(node));
    }

    // 第 level 列叶子的祖先链（各级已展开的分支节点）
    function ancestorPath(level: number): PptBizVariableNode[] {
      const path: PptBizVariableNode[] = [];
      for (let l = 0; l < level; l++) {
        const col = columns.value[l];
        const node = col && col[expanded.value[l]];
        if (node) path.push(node);
      }
      return path;
    }

    function pick(node: PptBizVariableNode, path: PptBizVariableNode[]) {
      emit('select', { key: path.map((n) => n.label).join('/'), label: node.label });
    }

    function pathText(path: PptBizVariableNode[]): string {
      return path.map((n) => n.label).join(' / ');
    }

    // 点击面板外关闭（编辑盒内点击被容器 stopPropagation 拦截，不会触发）
    function onGlobalMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.vpk-biz-var-picker')) emit('close');
    }

    onMounted(() => {
      // 挂到 body：画布 viewport 带 transform:scale，fixed 弹层在其内会相对缩放容器定位导致跑偏
      // （Vue 2 无 Teleport，手动搬移 DOM；事件绑定在元素上，搬移不影响）
      const el = panelRef.value;
      if (el) document.body.appendChild(el);
      // 捕获阶段监听：画布元素 mousedown 有 stopPropagation，冒泡阶段到不了 document
      document.addEventListener('mousedown', onGlobalMouseDown, true);
      // 面板已入 DOM：同步测量一次收敛 left（展开列变化路径才走 nextTick）
      measurePanelLeft();
    });

    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onGlobalMouseDown, true);
      const el = panelRef.value;
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });

    return {
      panelRef,
      keyword,
      expanded,
      panelLeft,
      columns,
      searchResults,
      hasChildren,
      childCount,
      onHover,
      onItemClick,
      pick,
      pathText,
    };
  },
});
</script>

<style scoped>
.vpk-biz-var-picker {
  position: fixed;
  z-index: 2400;
  /* 宽度随列数增长（面板自身移动适配），右缘受限时由 updatePanelLeft 左移收敛 */
  width: max-content;
  min-width: 300px;
  max-width: 90vw;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  padding: 8px;
  box-sizing: border-box;
  font-size: 13px;
}
.vpk-biz-var-search input {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 12px;
  color: #303133;
  outline: none;
}
.vpk-biz-var-search input:focus {
  border-color: var(--vpk-primary, #409eff);
}
.vpk-biz-var-body {
  display: flex;
  margin-top: 8px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  /* 极端兜底：面板已达 90vw 仍放不下时裁剪（正常路径不触发） */
  overflow: hidden;
}
/* 列固定宽：面板随列数自然增宽 */
.vpk-biz-var-col {
  width: 130px;
  flex: none;
  max-height: 260px;
  overflow-y: auto;
  border-right: 1px solid #ebeef5;
}
.vpk-biz-var-col:last-child {
  border-right: none;
}
.vpk-biz-var-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  cursor: pointer;
  color: #303133;
  white-space: nowrap;
}
.vpk-biz-var-item:hover,
.vpk-biz-var-item.active {
  background: #f5f7fa;
  color: var(--vpk-primary, #409eff);
}
.vpk-biz-var-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
.vpk-biz-var-desc {
  color: #909399;
  font-size: 12px;
}
.vpk-biz-var-extra {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.vpk-biz-var-count {
  background: #f0f2f5;
  color: #606266;
  border-radius: 8px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 16px;
}
.vpk-biz-var-item:hover .vpk-biz-var-count,
.vpk-biz-var-item.active .vpk-biz-var-count {
  color: var(--vpk-primary, #409eff);
}
.vpk-biz-var-arrow {
  font-size: 14px;
  color: #909399;
}
.vpk-biz-var-empty {
  padding: 12px 10px;
  color: #909399;
  font-size: 12px;
  text-align: center;
}
</style>
