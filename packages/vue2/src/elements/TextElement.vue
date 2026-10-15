<template>
  <!-- 常驻 ProseMirror 编辑器：editable 切换可编辑（无 v-if 销毁重建，参考 PPTist TextElement） -->
  <div ref="container" class="vpk-text-view" :style="containerStyle" @mousedown="onMouseDown">
    <RichEditor
      ref="editor"
      :value="element.text"
      :editable="editing"
      :scale="scale"
      @input="onInput"
      @blur="commit"
      @escape="commit"
      @selection="onSelection"
    />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { PptTextElement, RichTextState } from '@vue-ppt-kit/core';
import { emitter, RICH_TEXT_COMMAND, RICH_TEXT_STATE, RichTextCommand } from '../emitter';
import RichEditor from './RichEditor.vue';

// 参考 PPTist TextElement：编辑器常驻，样式分层——
// 元素级属性（字号/颜色/字体/行距/对齐/填充）作为容器默认样式，
// 富文本 mark 只记录差异部分，二者天然不冲突
export default Vue.extend({
  name: 'PptTextElement',
  components: { RichEditor },
  props: {
    element: { type: Object as () => PptTextElement, required: true },
    scale: { type: Number, default: 1 },
    editing: { type: Boolean, default: false },
  },
  computed: {
    // 容器默认样式层：PM 内容继承，元素属性修改实时生效
    containerStyle(): Record<string, string | number> {
      const el = this.element;
      return {
        fontSize: (el.fontSize || 16) * this.scale + 'px',
        color: el.color || '#303133',
        fontFamily: el.fontFamily || 'inherit',
        fontWeight: el.bold ? 'bold' : 'normal',
        // 行距缺省 1.4，与历史渲染保持一致
        lineHeight: String(el.lineHeight || 1.4),
        textAlign: el.align || 'left',
        // 文本框填充：铺满元素盒（空字符串 / 缺省为透明）
        background: el.fill || 'transparent',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        wordBreak: 'break-word',
      };
    },
  },
  // 编辑中光标状态回显给工具栏（加粗高亮、字号/字体/颜色跟随光标处样式）
  methods: {
    // 编辑态阻止 mousedown 冒泡（避免触发元素拖拽）；非编辑态放行给画布拖拽
    onMouseDown(e: MouseEvent) {
      if (this.editing) e.stopPropagation();
    },
    // 输入（300ms 防抖）/命令后回写：内容与高度实时同步到 store
    onInput(payload: { text: string; height: number }) {
      this.$emit('update', payload);
    },
    // 提交内容（blur / Escape）；空文本由编辑器层删除（checkEmptyText 语义）
    commit(payload: { text: string; height: number }) {
      if (!this.editing) return;
      this.$emit('commit', payload);
    },
    onSelection(state: RichTextState) {
      emitter.emit(RICH_TEXT_STATE, state);
    },
    // 工具栏富文本命令（参考 PPTist RICH_TEXT_COMMAND 事件）→ 编辑器执行
    onRichTextCommand(payload: RichTextCommand) {
      if (!this.editing) return;
      (this.$refs.editor as InstanceType<typeof RichEditor>)?.execCommand(payload);
    },
  },
  mounted() {
    emitter.on(RICH_TEXT_COMMAND, this.onRichTextCommand);
  },
  beforeDestroy() {
    emitter.off(RICH_TEXT_COMMAND, this.onRichTextCommand);
  },
});
</script>

<style scoped>
.vpk-text-view :deep(p) {
  margin: 0;
}
</style>
