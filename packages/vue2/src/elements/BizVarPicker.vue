<template>
  <!-- fx 变量选择面板（图 1/图 2）：顶部搜索 + 多列级联；
       挂到 body（画布 transform:scale 会让 fixed 相对缩放容器定位导致跑偏）；
       面板宽度随列数增长，右缘将超出视口时面板自身向左移动（updatePanelLeft） -->
  <div class="vpk-biz-var-picker" :style="{ left: panelLeft + 'px', top: anchor.top + 'px' }">
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
import Vue from 'vue';
import type { PptBizVariableNode } from '@vue-ppt-kit/core';

interface FlatItem {
  node: PptBizVariableNode;
  path: PptBizVariableNode[];
}

// 业务变量级联选择器：叶子点击后 emit select（key 为「/」分隔的路径，label 为叶子文字）
export default Vue.extend({
  name: 'PptBizVarPicker',
  props: {
    variables: { type: Array as () => PptBizVariableNode[], required: true },
    /** 锚点：fx 按钮左下角（视口坐标）；面板实测宽度后据此自收敛 left */
    anchor: { type: Object as () => { left: number; top: number }, required: true },
  },
  data() {
    return {
      keyword: '',
      // 每级展开的分支下标（expanded[i] = 第 i 列展开项），columns 据此推导级联列
      expanded: [] as number[],
      // 面板实际 left（挂载与列变化后按面板实测宽度收敛，避免右缘溢出视口）
      panelLeft: 0,
    };
  },
  computed: {
    columns(): PptBizVariableNode[][] {
      const cols: PptBizVariableNode[][] = [this.variables];
      this.expanded.forEach((idx, level) => {
        const node = cols[level] && cols[level][idx];
        if (node && node.children && node.children.length) cols.push(node.children);
      });
      return cols;
    },
    flatLeaves(): FlatItem[] {
      const out: FlatItem[] = [];
      const walk = (nodes: PptBizVariableNode[], path: PptBizVariableNode[]) => {
        nodes.forEach((node) => {
          if (this.hasChildren(node)) walk(node.children as PptBizVariableNode[], path.concat(node));
          else out.push({ node, path });
        });
      };
      walk(this.variables, []);
      return out;
    },
    searchResults(): FlatItem[] {
      const kw = this.keyword.trim().toLowerCase();
      if (!kw) return [];
      return this.flatLeaves.filter((item) => item.node.label.toLowerCase().includes(kw));
    },
  },
  mounted() {
    // 挂到 body：画布 viewport 带 transform:scale，fixed 弹层在其内会相对缩放容器定位导致跑偏
    // （Vue 2 无 Teleport，手动搬移 DOM；事件绑定在元素上，搬移不影响）
    document.body.appendChild(this.$el);
    // 捕获阶段监听：画布元素 mousedown 有 stopPropagation，冒泡阶段到不了 document
    document.addEventListener('mousedown', this.onGlobalMouseDown, true);
    this.updatePanelLeft();
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onGlobalMouseDown, true);
    if (this.$el && this.$el.parentNode) this.$el.parentNode.removeChild(this.$el);
  },
  methods: {
    hasChildren(node: PptBizVariableNode): boolean {
      return !!(node.children && node.children.length);
    },
    // 子节点数（Vue2 模板不支持 TS 非空断言，经方法收窄）
    childCount(node: PptBizVariableNode): number {
      return (node.children || []).length;
    },
    // 悬停即展开（级联交互）；点击分支同样展开
    onHover(node: PptBizVariableNode, level: number, idx: number) {
      if (this.hasChildren(node)) this.expand(level, idx);
    },
    expand(level: number, idx: number) {
      if (this.expanded[level] === idx) return;
      // 截断至该列：后续列随 columns 计算属性自动收窄
      const next = this.expanded.slice(0, level);
      next[level] = idx;
      this.expanded = next;
      // 列变化后面板宽度改变：按实测宽度重新收敛 left（面板自身移动，非滚动条）
      this.$nextTick(() => this.updatePanelLeft());
    },
    // 面板左缘收敛：右缘将超出视口时整体向左移，保证完整可见
    updatePanelLeft() {
      const el = this.$el as HTMLElement;
      if (!el || !el.offsetWidth) return;
      this.panelLeft = Math.max(8, Math.min(this.anchor.left, window.innerWidth - el.offsetWidth - 8));
    },
    onItemClick(node: PptBizVariableNode, level: number, idx: number) {
      if (this.hasChildren(node)) {
        this.expand(level, idx);
        return;
      }
      this.pick(node, this.ancestorPath(level).concat(node));
    },
    // 第 level 列叶子的祖先链（各级已展开的分支节点）
    ancestorPath(level: number): PptBizVariableNode[] {
      const path: PptBizVariableNode[] = [];
      for (let l = 0; l < level; l++) {
        const col = this.columns[l];
        const node = col && col[this.expanded[l]];
        if (node) path.push(node);
      }
      return path;
    },
    pick(node: PptBizVariableNode, path: PptBizVariableNode[]) {
      this.$emit('select', { key: path.map((n) => n.label).join('/'), label: node.label });
    },
    pathText(path: PptBizVariableNode[]): string {
      return path.map((n) => n.label).join(' / ');
    },
    onGlobalMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.vpk-biz-var-picker')) this.$emit('close');
    },
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
