<template>
  <!-- 常驻 ProseMirror 编辑器：editable 切换可编辑（无 v-if 销毁重建，参考 PPTist TextElement） -->
  <div ref="containerRef" class="vpk-text-view" :style="containerStyle" @mousedown="onMouseDown">
    <RichEditor
      ref="editorRef"
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

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, type CSSProperties } from 'vue';
import type { PptTextElement, RichTextState } from '@vue-ppt-kit/core';
import { emitter, RICH_TEXT_COMMAND, RICH_TEXT_STATE, type RichTextCommand } from '../emitter';
import RichEditor from './RichEditor.vue';

// 参考 PPTist TextElement：编辑器常驻，样式分层——
// 元素级属性（字号/颜色/字体/行距/对齐/填充）作为容器默认样式，
// 富文本 mark 只记录差异部分，二者天然不冲突
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

const editorRef = ref<InstanceType<typeof RichEditor>>();

// 容器默认样式层：PM 内容继承，元素属性修改实时生效
const containerStyle = computed<CSSProperties>(() => ({
  fontSize: `${(props.element.fontSize ?? 16) * props.scale}px`,
  color: props.element.color ?? '#303133',
  fontFamily: props.element.fontFamily || 'inherit',
  fontWeight: props.element.bold ? 'bold' : 'normal',
  // 行距缺省 1.4，与历史渲染保持一致
  lineHeight: props.element.lineHeight ?? 1.4,
  textAlign: props.element.align ?? 'left',
  // 文本框填充：铺满元素盒（空字符串 / 缺省为透明）
  background: props.element.fill || 'transparent',
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
  wordBreak: 'break-word',
}));

// 编辑态阻止 mousedown 冒泡（避免触发元素拖拽）；非编辑态放行给画布拖拽
function onMouseDown(e: MouseEvent) {
  if (props.editing) e.stopPropagation();
}

// 输入（300ms 防抖）/命令后回写：内容与高度实时同步到 store
function onInput(payload: { text: string; height: number }) {
  emit('update', payload);
}

// 提交内容（blur / Escape）；空文本由编辑器层删除（checkEmptyText 语义）
function commit(payload: { text: string; height: number }) {
  if (!props.editing) return;
  emit('commit', payload);
}

// 编辑中光标状态回显给工具栏（加粗高亮、字号/字体/颜色跟随光标处样式）
function onSelection(state: RichTextState) {
  emitter.emit(RICH_TEXT_STATE, state);
}

// 工具栏富文本命令（参考 PPTist RICH_TEXT_COMMAND 事件）→ 编辑器执行
function onRichTextCommand(payload: RichTextCommand) {
  if (!props.editing) return;
  editorRef.value?.execCommand(payload);
}

emitter.on(RICH_TEXT_COMMAND, onRichTextCommand);
onBeforeUnmount(() => {
  emitter.off(RICH_TEXT_COMMAND, onRichTextCommand);
});
</script>

<style scoped>
.vpk-text-view :deep(p) {
  margin: 0;
}
</style>
