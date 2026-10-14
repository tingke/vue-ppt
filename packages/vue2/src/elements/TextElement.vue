<template>
  <textarea
    v-if="editing"
    ref="taRef"
    v-model="draft"
    rows="1"
    class="vpk-text-editor"
    :style="editorStyle"
    @input="onInput"
    @blur="commit"
    @keydown.esc.prevent="commit"
    @mousedown.stop
  ></textarea>
  <span v-else :style="textStyle">{{ element.text }}</span>
</template>

<script lang="ts">
import Vue from 'vue';
import { PptTextElement } from '@vue-ppt-kit/core';

// 参考 PPTist TextElement：静态时纯渲染，editing 时切换为可编辑输入区
// （PPTist 用 ProseMirror 富文本，这里简化为 textarea 覆盖层）
export default Vue.extend({
  name: 'PptTextElement',
  props: {
    element: { type: Object as () => PptTextElement, required: true },
    scale: { type: Number, default: 1 },
    editing: { type: Boolean, default: false },
  },
  data() {
    return { draft: this.element.text as string };
  },
  watch: {
    editing(v: boolean) {
      if (!v) return;
      this.draft = this.element.text;
      this.$nextTick(() => {
        this.syncHeight();
        const ta = this.$refs.taRef as HTMLTextAreaElement | undefined;
        if (!ta) return;
        ta.focus();
        ta.select();
      });
    },
  },
  computed: {
    textStyle(): Record<string, string | undefined> {
      const el = this.element;
      return {
        fontSize: (el.fontSize || 16) * this.scale + 'px',
        color: el.color || '#303133',
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      };
    },
    editorStyle(): Record<string, string | undefined> {
      return {
        ...this.textStyle,
        width: '100%',
        height: 'auto',
        margin: '0',
        padding: '0',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        resize: 'none',
        overflow: 'hidden',
        display: 'block',
        fontFamily: 'inherit',
        cursor: 'text',
        boxSizing: 'border-box',
      };
    },
  },
  methods: {
    // 让 textarea 高度跟随内容（避免打字时内容被裁剪、显示不同步），返回文档单位高度
    syncHeight(): number {
      const ta = this.$refs.taRef as HTMLTextAreaElement | undefined;
      if (!ta) return this.element.height;
      ta.style.height = 'auto';
      const px = ta.scrollHeight;
      ta.style.height = px + 'px';
      return Math.max(Math.round(px / this.scale), 24);
    },
    // 输入过程中实时同步内容与高度（参考 PPTist 编辑器实时写回 store）
    onInput() {
      const height = this.syncHeight();
      this.$emit('update', { text: this.draft, height });
    },
    // 提交内容；高度按内容真实高度回写
    commit() {
      if (!this.editing) return;
      const height = this.syncHeight();
      this.$emit('commit', { text: this.draft, height });
    },
  },
});
</script>
