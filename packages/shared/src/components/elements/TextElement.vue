<template>
  <!-- 静态渲染路径（缩略图等无交互场景）：不挂 ProseMirror，白名单过滤后 v-html
       （vue2 / vue3 双端共享，P1-3：普通 defineComponent + setup()） -->
  <div v-if="static" class="vpk-text-view ProseMirror-static" :style="containerStyle" v-html="staticHtml"></div>
  <!-- 常驻 ProseMirror 编辑器：editable 切换可编辑（无 v-if 销毁重建） -->
  <div v-else class="vpk-text-view" :style="containerStyle" @mousedown="onMouseDown">
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

<script lang="ts">
import { computed, defineComponent, inject, onBeforeUnmount, ref } from '@vpk/vue-api';
import type { PropType } from '@vpk/vue-api';
import {
  EDITOR_EMITTER,
  RICH_TEXT_COMMAND,
  RICH_TEXT_STATE,
  sanitizeRichText,
  DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_COLOR,
  DEFAULT_LINE_HEIGHT,
} from '@tthappy/ppt-core';
import type { EditorEmitter, RichTextCommand, RichTextState, PptTextElement } from '@tthappy/ppt-core';
import { sharedEmitter } from '../../emitter';
import RichEditor from './RichEditor.vue';
import type { RichEditorApi } from './RichEditor.vue';

// 编辑器常驻，样式分层——
// 元素级属性（字号/颜色/字体/行距/对齐/填充）作为容器默认样式，
// 富文本 mark 只记录差异部分，二者天然不冲突
export default defineComponent({
  name: 'PptTextElement',
  components: { RichEditor },
  props: {
    element: { type: Object as PropType<PptTextElement>, required: true },
    scale: { type: Number, default: 1 },
    editing: { type: Boolean, default: false },
    /** 静态渲染（缩略图等）：不创建编辑器实例，仅输出过滤后的 HTML */
    static: { type: Boolean, default: false },
  },
  emits: ['commit', 'update'],
  setup(props, { emit }) {
    // 编辑器实例级事件转发器（编辑器 provide 注入），兜底 sharedEmitter 供独立使用
    const emitter = inject<EditorEmitter>(EDITOR_EMITTER, sharedEmitter);
    const editorRef = ref<RichEditorApi | null>(null);

    // 容器默认样式层：PM 内容继承，元素属性修改实时生效
    // （样式用宽松 Record 类型：CSSProperties 为 vue3 类型面，vue2 端不具备）
    const containerStyle = computed<Record<string, string | number>>(() => {
      const el = props.element;
      return {
        fontSize: (el.fontSize ?? DEFAULT_FONT_SIZE) * props.scale + 'px',
        color: el.color ?? DEFAULT_TEXT_COLOR,
        fontFamily: el.fontFamily || 'inherit',
        fontWeight: el.bold ? 'bold' : 'normal',
        // 行距缺省 1.4，与历史渲染保持一致
        lineHeight: String(el.lineHeight ?? DEFAULT_LINE_HEIGHT),
        textAlign: el.align ?? 'left',
        // 文本框填充：铺满元素盒（空字符串 / 缺省为透明）
        background: el.fill || 'transparent',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        wordBreak: 'break-word',
      };
    });

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
      const editor = editorRef.value;
      if (editor) editor.execCommand(payload);
    }

    emitter.on(RICH_TEXT_COMMAND, onRichTextCommand);
    onBeforeUnmount(() => {
      emitter.off(RICH_TEXT_COMMAND, onRichTextCommand);
    });

    return { editorRef, containerStyle, staticHtml, onMouseDown, onInput, onBlur, commit, onSelection };
  },
});
</script>

<style scoped>
/* 段落 margin 由全局 .ProseMirror / .ProseMirror-static 规则接管（含段间距 --paragraphSpace） */
</style>
