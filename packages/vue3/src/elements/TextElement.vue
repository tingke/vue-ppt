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

<script setup lang="ts">
import { computed, nextTick, ref, watch, type CSSProperties } from 'vue';
import type { PptTextElement } from '@vue-ppt-kit/core';

// 参考 PPTist TextElement：静态时纯渲染，editing 时切换为可编辑输入区
// （PPTist 用 ProseMirror 富文本，这里简化为 textarea 覆盖层）
const props = withDefaults(defineProps<{
  element: PptTextElement;
  scale?: number;
  editing?: boolean;
}>(), {
  scale: 1,
  editing: false,
});

const emit = defineEmits<{
  (e: 'commit', payload: { text: string; height: number }): void;
  (e: 'update', payload: { text: string; height: number }): void;
}>();

const taRef = ref<HTMLTextAreaElement>();
const draft = ref(props.element.text);

watch(() => props.editing, (v) => {
  if (!v) return;
  draft.value = props.element.text;
  nextTick(() => {
    syncHeight();
    taRef.value?.focus();
    taRef.value?.select();
  });
});

const textStyle = computed<CSSProperties>(() => ({
  fontSize: `${(props.element.fontSize ?? 16) * props.scale}px`,
  color: props.element.color ?? '#303133',
  lineHeight: 1.4,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}));

const editorStyle = computed<CSSProperties>(() => ({
  ...textStyle.value,
  width: '100%',
  height: 'auto',
  margin: 0,
  padding: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  resize: 'none',
  overflow: 'hidden',
  display: 'block',
  fontFamily: 'inherit',
  cursor: 'text',
}));

// 让 textarea 高度跟随内容（避免打字时内容被裁剪、显示不同步），返回文档单位高度
function syncHeight(): number {
  const ta = taRef.value;
  if (!ta) return props.element.height;
  ta.style.height = 'auto';
  const px = ta.scrollHeight;
  ta.style.height = `${px}px`;
  return Math.max(Math.round(px / props.scale), MIN_TEXT_HEIGHT);
}

// 输入过程中实时同步内容与高度（参考 PPTist 编辑器实时写回 store）
function onInput() {
  const height = syncHeight();
  emit('update', { text: draft.value, height });
}

// 提交内容；高度按内容真实高度回写（临时置 auto 以测量可收缩高度）
function commit() {
  if (!props.editing) return;
  const height = syncHeight();
  emit('commit', { text: draft.value, height });
}

const MIN_TEXT_HEIGHT = 24;
</script>

<style scoped>
.vpk-text-editor {
  box-sizing: border-box;
}
</style>
