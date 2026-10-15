<template>
  <!-- ProseMirror 常驻编辑器：无 v-if 切换，editable 控制可编辑（参考 PPTist ProsemirrorEditor） -->
  <div ref="containerRef" class="vpk-rich-editor"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { TextEditor, type RichTextAction, type RichTextState } from '@vue-ppt-kit/core';

const props = withDefaults(defineProps<{
  /** 受限白名单内联 HTML（PptTextElement.text），纯文本天然兼容 */
  value: string;
  editable?: boolean;
  /** 画布缩放比（高度换算用） */
  scale?: number;
}>(), {
  editable: false,
  scale: 1,
});

const emit = defineEmits<{
  /** 内容/高度变化（内部已 300ms 防抖，blur 时立即 flush） */
  (e: 'input', payload: { text: string; height: number }): void;
  (e: 'focus'): void;
  /** 失焦提交：携带最终内容与高度 */
  (e: 'blur', payload: { text: string; height: number }): void;
  /** Escape 提交：携带最终内容与高度 */
  (e: 'escape', payload: { text: string; height: number }): void;
  (e: 'selection', state: RichTextState): void;
}>();

const containerRef = ref<HTMLDivElement>();
let editor: TextEditor | null = null;

onMounted(() => {
  editor = TextEditor.create({
    dom: containerRef.value!,
    content: props.value,
    editable: props.editable,
    scale: props.scale,
    onInput: (text, height) => emit('input', { text, height }),
    onFocus: () => emit('focus'),
    onBlur: (payload) => emit('blur', payload),
    onEscape: (payload) => emit('escape', payload),
    onSelectionChange: (state) => emit('selection', state),
  });
});

onBeforeUnmount(() => {
  editor?.destroy();
  editor = null;
});

// 可编辑切换：不销毁重建，仅切换 editable（PPTist setProps 同款）
watch(() => props.editable, (v) => {
  if (!editor) return;
  editor.setEditable(v);
  if (v) {
    editor.focus();
    editor.selectAll();
  }
});

// 外部内容回写：编辑器持焦时内部自动忽略（防跳光标）
watch(() => props.value, (v) => editor?.setContent(v));

// 供父组件调用：执行富文本命令（工具栏 → 编辑器）
function execCommand(action: RichTextAction) {
  editor?.execCommand(action);
}

defineExpose({ execCommand });
</script>

<style scoped>
.vpk-rich-editor {
  cursor: text;
}
</style>
