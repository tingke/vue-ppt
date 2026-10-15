<template>
  <!-- ProseMirror 常驻编辑器：无 v-if 切换，editable 控制可编辑（参考 PPTist ProsemirrorEditor） -->
  <div ref="container" class="vpk-rich-editor"></div>
</template>

<script lang="ts">
import Vue from 'vue';
import { TextEditor, RichTextAction, RichTextState } from '@vue-ppt-kit/core';

// ProseMirror 薄封装：初始化/销毁由本组件管理，命令经 execCommand 暴露给父组件
export default Vue.extend({
  name: 'PptRichEditor',
  props: {
    /** 受限白名单内联 HTML（PptTextElement.text），纯文本天然兼容 */
    value: { type: String, required: true },
    editable: { type: Boolean, default: false },
    /** 画布缩放比（高度换算用） */
    scale: { type: Number, default: 1 },
  },
  data() {
    return { editor: null as TextEditor | null };
  },
  watch: {
    // 可编辑切换：不销毁重建，仅切换 editable（PPTist setProps 同款）
    editable(v: boolean) {
      if (!this.editor) return;
      this.editor.setEditable(v);
      if (v) {
        this.editor.focus();
        this.editor.selectAll();
      }
    },
    // 外部内容回写：编辑器持焦时内部自动忽略（防跳光标）
    value(v: string) {
      this.editor?.setContent(v);
    },
  },
  mounted() {
    this.editor = TextEditor.create({
      dom: this.$refs.container as Element,
      content: this.value,
      editable: this.editable,
      scale: this.scale,
      onInput: (text, height) => this.$emit('input', { text, height }),
      onFocus: () => this.$emit('focus'),
      onBlur: (payload) => this.$emit('blur', payload),
      onEscape: (payload) => this.$emit('escape', payload),
      onSelectionChange: (state: RichTextState) => this.$emit('selection', state),
    });
  },
  beforeDestroy() {
    this.editor?.destroy();
    this.editor = null;
  },
  methods: {
    // 供父组件调用：执行富文本命令（工具栏 → 编辑器）
    execCommand(action: RichTextAction) {
      this.editor?.execCommand(action);
    },
  },
});
</script>

<style scoped>
.vpk-rich-editor {
  cursor: text;
}
/* PM 编辑区按 DOM 换行符与空白渲染（换行/连续空格不塌陷），长词可断行 */
.vpk-rich-editor :deep(.ProseMirror) {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
