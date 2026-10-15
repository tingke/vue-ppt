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
    // 挂载即回写实测内容高度：新增文本的工厂默认高度（如 60）通常不等于
    // 编辑器内容实际高度，不同步会导致 vpk-text-view 与 vpk-rich-editor
    // 高度不一致、首次编辑（300ms 防抖回写）时盒子跳变
    // （参考 PPTist TextElement 的 ResizeObserver 挂载即同步高度）
    this.$emit('input', { text: this.value, height: this.editor.measureHeight() });
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

<style>
.vpk-rich-editor {
  cursor: text;
}
/* ProseMirror 富文本默认样式（参考 PPTist prosemirror.scss）：
   同时覆盖编辑区（.ProseMirror）与静态渲染（.ProseMirror-static）。
   不在此设置 font-size：字号由元素级容器（.vpk-text-view 内联样式）逐级继承，
   固定值会以类选择器优先级压过用户设置的元素字号 */
.ProseMirror,
.ProseMirror-static {
  outline: 0;
  border: 0;
  overflow-wrap: break-word;
  word-break: normal;
  white-space: normal;
}
.ProseMirror:not(.ProseMirror-static) {
  -webkit-user-select: text;
  user-select: text;
}
.ProseMirror ::selection,
.ProseMirror-static ::selection {
  background-color: #d1442440;
  color: inherit;
}
.ProseMirror p,
.ProseMirror-static p {
  margin: 0;
  /* 段间距：元素级 CSS 变量，缺省 5px（PPTist 默认值） */
  margin-top: var(--paragraphSpace, 5px);
}
.ProseMirror p:first-child,
.ProseMirror-static p:first-child {
  margin-top: 0;
}
.ProseMirror ul,
.ProseMirror ol,
.ProseMirror li,
.ProseMirror-static ul,
.ProseMirror-static ol,
.ProseMirror-static li {
  margin: 0;
  margin-top: var(--paragraphSpace, 5px);
}
.ProseMirror ul,
.ProseMirror-static ul {
  list-style-type: disc;
  padding-inline-start: 1.25em;
}
.ProseMirror ul li,
.ProseMirror-static ul li {
  list-style-type: inherit;
}
.ProseMirror ol,
.ProseMirror-static ol {
  list-style-type: decimal;
  padding-inline-start: 1.25em;
}
.ProseMirror ol li,
.ProseMirror-static ol li {
  list-style-type: inherit;
}
.ProseMirror code,
.ProseMirror-static code {
  background-color: #f1f1f1;
  padding: 2px 6px;
  margin: 0 1px;
  border-radius: 4px;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
}
.ProseMirror sup,
.ProseMirror-static sup {
  vertical-align: super;
  font-size: smaller;
}
.ProseMirror sub,
.ProseMirror-static sub {
  vertical-align: sub;
  font-size: smaller;
}
.ProseMirror blockquote,
.ProseMirror-static blockquote {
  overflow: hidden;
  padding: 0 1.2em;
  margin: 0.6em 0;
  font-style: italic;
  border-left: 4px solid #e0e0e0;
}
.ProseMirror [data-indent='1'],
.ProseMirror-static [data-indent='1'] {
  padding-left: 1em;
}
.ProseMirror [data-indent='2'],
.ProseMirror-static [data-indent='2'] {
  padding-left: 2em;
}
.ProseMirror [data-indent='3'],
.ProseMirror-static [data-indent='3'] {
  padding-left: 3em;
}
.ProseMirror [data-indent='4'],
.ProseMirror-static [data-indent='4'] {
  padding-left: 4em;
}
.ProseMirror [data-indent='5'],
.ProseMirror-static [data-indent='5'] {
  padding-left: 5em;
}
.ProseMirror [data-indent='6'],
.ProseMirror-static [data-indent='6'] {
  padding-left: 6em;
}
.ProseMirror [data-indent='7'],
.ProseMirror-static [data-indent='7'] {
  padding-left: 7em;
}
.ProseMirror [data-indent='8'],
.ProseMirror-static [data-indent='8'] {
  padding-left: 8em;
}
.ProseMirror-selectednode {
  outline: none !important;
}
</style>
