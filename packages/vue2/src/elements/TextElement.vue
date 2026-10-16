<template>
  <!-- 静态渲染路径（缩略图等无交互场景）：不挂 ProseMirror，白名单过滤后 v-html -->
  <div v-if="static" class="vpk-text-view ProseMirror-static" :style="containerStyle" v-html="staticHtml"></div>
  <!-- 常驻 ProseMirror 编辑器：editable 切换可编辑（无 v-if 销毁重建） -->
  <div v-else ref="container" class="vpk-text-view" :style="containerStyle" @mousedown="onMouseDown">
    <RichEditor
      ref="editor"
      :value="element.text"
      :editable="editing"
      :scale="scale"
      @input="onInput"
      @blur="onBlur"
      @escape="commit"
      @selection="onSelection"
    />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import {
  EDITOR_EMITTER,
  RICH_TEXT_COMMAND,
  RICH_TEXT_STATE,
  EditorEmitter,
  RichTextCommand,
  RichTextState,
  sanitizeRichText,
  PptTextElement,
} from '@vue-ppt/core';
import { sharedEmitter } from '../emitter';
import RichEditor from './RichEditor.vue';

// 编辑器常驻，样式分层——
// 元素级属性（字号/颜色/字体/行距/对齐/填充）作为容器默认样式，
// 富文本 mark 只记录差异部分，二者天然不冲突
export default Vue.extend({
  name: 'PptTextElement',
  components: { RichEditor },
  // 编辑器实例级事件转发器（PptStage provide 注入）；兜底 sharedEmitter 供独立使用
  inject: {
    editorEmitter: { from: EDITOR_EMITTER, default: () => sharedEmitter },
  },
  props: {
    element: { type: Object as () => PptTextElement, required: true },
    scale: { type: Number, default: 1 },
    editing: { type: Boolean, default: false },
    // 静态渲染（缩略图等）：不创建编辑器实例，仅输出过滤后的 HTML
    static: { type: Boolean, default: false },
  },
  computed: {
    // inject 的转发器（Vue 2 类型系统不将 inject 键并入 this，经 computed 收窄类型）
    emitter(): EditorEmitter {
      return ((this as any).editorEmitter as EditorEmitter) || sharedEmitter;
    },
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
    // 静态渲染内容：与编辑态同源的白名单过滤
    staticHtml(): string {
      return sanitizeRichText(this.element.text);
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
    // 失焦仅回写、不退出编辑：点击工具栏下拉等导致的 blur
    // 不应结束编辑，退出仅由选中切换 / 点击空白 / Escape 触发
    onBlur(payload: { text: string; height: number }) {
      if (!this.editing) return;
      this.$emit('update', payload);
    },
    // Escape 提交并结束编辑；空文本由编辑器层删除（checkEmptyText 语义）
    commit(payload: { text: string; height: number }) {
      if (!this.editing) return;
      this.$emit('commit', payload);
    },
    onSelection(state: RichTextState) {
      this.emitter.emit(RICH_TEXT_STATE, state);
    },
    // 工具栏富文本命令 → 编辑器执行
    // 仅响应以自身元素为 target 的命令（多实例共存时防误投递）
    onRichTextCommand(payload: RichTextCommand) {
      if (!this.editing) return;
      if (payload.target && payload.target !== this.element.id) return;
      (this.$refs.editor as InstanceType<typeof RichEditor>)?.execCommand(payload);
    },
  },
  mounted() {
    this.emitter.on(RICH_TEXT_COMMAND, this.onRichTextCommand);
  },
  beforeDestroy() {
    this.emitter.off(RICH_TEXT_COMMAND, this.onRichTextCommand);
  },
});
</script>

<style scoped>
/* 段落 margin 由全局 .ProseMirror / .ProseMirror-static 规则接管（含段间距 --paragraphSpace） */
</style>
