<template>
  <!-- 静态渲染路径（缩略图等无交互场景）：不挂 ProseMirror，白名单过滤后 v-html -->
  <div v-if="static" class="vpk-text-view ProseMirror-static" :style="containerStyle" v-html="staticHtml"></div>
  <!-- 常驻 ProseMirror 编辑器：editable 切换可编辑（无 v-if 销毁重建） -->
  <div v-else ref="containerRef" class="vpk-text-view" :style="containerStyle" @mousedown="onMouseDown">
    <RichEditor
      ref="editorRef"
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

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, type CSSProperties } from 'vue';
import {
  EDITOR_EMITTER,
  RICH_TEXT_COMMAND,
  RICH_TEXT_STATE,
  type EditorEmitter,
  type RichTextCommand,
  type RichTextState,
  sanitizeRichText,
  type PptTextElement,
} from '@tthappy/ppt-core';
import { sharedEmitter } from '../emitter';
import RichEditor from './RichEditor.vue';

// 编辑器常驻，样式分层——
// 元素级属性（字号/颜色/字体/行距/对齐/填充）作为容器默认样式，
// 富文本 mark 只记录差异部分，二者天然不冲突
const props = withDefaults(defineProps<{
  element: PptTextElement;
  scale?: number;
  editing?: boolean;
  /** 静态渲染（缩略图等）：不创建编辑器实例，仅输出过滤后的 HTML */
  static?: boolean;
}>(), {
  scale: 1,
  editing: false,
  static: false,
});

const emit = defineEmits<{
  (e: 'commit', payload: { text: string; height: number }): void;
  (e: 'update', payload: { text: string; height: number }): void;
}>();

const editorRef = ref<InstanceType<typeof RichEditor>>();

// 编辑器实例级事件转发器（PptEditor provide 注入），兜底 sharedEmitter 供独立使用
const emitter = inject<EditorEmitter>(EDITOR_EMITTER, sharedEmitter);

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

// 静态渲染内容：与编辑态同源的白名单过滤
const staticHtml = computed(() => sanitizeRichText(props.element.text));

// 编辑态阻止 mousedown 冒泡（避免触发元素拖拽）；非编辑态放行给画布拖拽
function onMouseDown(e: MouseEvent) {
  if (props.editing) e.stopPropagation();
}

// 输入（300ms 防抖）/命令后回写：内容与高度实时同步到 store
function onInput(payload: { text: string; height: number }) {
  emit('update', payload);
}

// 失焦仅回写、不退出编辑：点击工具栏下拉等导致的 blur
// 不应结束编辑，退出仅由选中切换 / 点击空白 / Escape 触发
function onBlur(payload: { text: string; height: number }) {
  if (!props.editing) return;
  emit('update', payload);
}

// Escape 提交并结束编辑；空文本由编辑器层删除（checkEmptyText 语义）
function commit(payload: { text: string; height: number }) {
  if (!props.editing) return;
  emit('commit', payload);
}

// 编辑中光标状态回显给工具栏（加粗高亮、字号/字体/颜色跟随光标处样式）
function onSelection(state: RichTextState) {
  emitter.emit(RICH_TEXT_STATE, state);
}

// 工具栏富文本命令 → 编辑器执行
// 仅响应以自身元素为 target 的命令（多实例共存时防误投递）
function onRichTextCommand(payload: RichTextCommand) {
  if (!props.editing) return;
  if (payload.target && payload.target !== props.element.id) return;
  editorRef.value?.execCommand(payload);
}

emitter.on(RICH_TEXT_COMMAND, onRichTextCommand);
onBeforeUnmount(() => {
  emitter.off(RICH_TEXT_COMMAND, onRichTextCommand);
});
</script>

<style scoped>
/* 段落 margin 由全局 .ProseMirror / .ProseMirror-static 规则接管（含段间距 --paragraphSpace） */
</style>
