<template>
  <!-- 静态渲染路径（缩略图等无交互场景）：不挂 ProseMirror，白名单过滤后 v-html
       （vue2 / vue3 双端共享，P1-3：普通 defineComponent + setup()） -->
  <div v-if="static" class="vpk-text-view ProseMirror-static" :style="containerStyle" v-html="staticHtml"></div>
  <!-- 常驻 ProseMirror 编辑器：editable 切换可编辑（无 v-if 销毁重建） -->
  <div v-else class="vpk-text-view vpk-biztext-view" :style="containerStyle" @mousedown="onMouseDown">
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
    <!-- fx 按钮（图 1）：编辑态出现，点击弹出业务变量级联选择 -->
    <button v-if="editing" type="button" class="vpk-biz-fx" title="插入业务字段" @click="togglePicker($event)">fx</button>
    <BizVarPicker
      v-if="pickerVisible"
      :variables="variables"
      :anchor="pickerAnchor"
      @select="onPickVariable"
      @close="closePicker"
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
import type { EditorEmitter, RichTextCommand, RichTextState, PptBizTextElement, PptBizVariableNode } from '@tthappy/ppt-core';
import { BIZ_VARIABLES_KEY, sharedEmitter } from '../../emitter';
import RichEditor from './RichEditor.vue';
import type { RichEditorApi } from './RichEditor.vue';
import BizVarPicker from './BizVarPicker.vue';

// 业务文本组件：普通文本与业务字段 tag 混排。输入 / 富文本命令与文本组件一致
// （同一 ProseMirror 内核），差异仅在于编辑态 fx 按钮与 tag 原子节点（不可编辑，退格整删）
export default defineComponent({
  name: 'PptBizTextElement',
  components: { RichEditor, BizVarPicker },
  props: {
    element: { type: Object as PropType<PptBizTextElement>, required: true },
    scale: { type: Number, default: 1 },
    editing: { type: Boolean, default: false },
    /** 静态渲染（缩略图等）：不创建编辑器实例，仅输出过滤后的 HTML */
    static: { type: Boolean, default: false },
  },
  emits: ['commit', 'update'],
  setup(props, { emit }) {
    // 编辑器实例级事件转发器（编辑器 provide 注入），兜底 sharedEmitter 供独立使用
    const emitter = inject<EditorEmitter>(EDITOR_EMITTER, sharedEmitter);
    // 业务变量树（编辑器 provide）；脱离编辑器树单独使用时为空
    const variables = inject<PptBizVariableNode[]>(BIZ_VARIABLES_KEY, []);
    const editorRef = ref<RichEditorApi | null>(null);

    // fx 弹层显隐与锚点（fx 按钮左下角视口坐标）：面板挂 body，宽度自收敛由 BizVarPicker 内部处理
    const pickerVisible = ref(false);
    const pickerAnchor = ref({ left: 0, top: 0 });

    // 容器默认样式层：与文本组件一致（PM 内容继承，元素属性修改实时生效）
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

    // 静态渲染内容：与编辑态同源的白名单过滤（业务 tag 的 data-biz-tag 保留）
    const staticHtml = computed(() => sanitizeRichText(props.element.text));

    // 编辑态阻止 mousedown 冒泡（避免触发元素拖拽 + 兜住面板外点关闭判定）
    function onMouseDown(e: MouseEvent) {
      if (props.editing) e.stopPropagation();
    }

    // 输入（300ms 防抖）/命令后回写：内容与高度实时同步到 store
    function onInput(payload: { text: string; height: number }) {
      emit('update', payload);
    }

    // 失焦仅回写、不退出编辑：点击 fx 弹层等导致的 blur 不结束编辑
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

    // fx 弹层：锚定 fx 按钮左下角（面板挂 body，宽度自收敛由 BizVarPicker 内部处理）
    function togglePicker(e: Event) {
      pickerVisible.value = !pickerVisible.value;
      if (pickerVisible.value) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        pickerAnchor.value = { left: rect.left, top: rect.bottom + 6 };
      }
    }

    function closePicker() {
      pickerVisible.value = false;
    }

    // 选中变量：在当前光标处插入 tag（不可编辑原子节点，退格整体删除）
    function onPickVariable(tag: { key: string; label: string }) {
      const editor = editorRef.value;
      if (editor) editor.insertBizTag(tag);
      pickerVisible.value = false;
    }

    emitter.on(RICH_TEXT_COMMAND, onRichTextCommand);
    onBeforeUnmount(() => {
      emitter.off(RICH_TEXT_COMMAND, onRichTextCommand);
    });

    return {
      editorRef,
      variables,
      pickerVisible,
      pickerAnchor,
      containerStyle,
      staticHtml,
      onMouseDown,
      onInput,
      onBlur,
      commit,
      onSelection,
      togglePicker,
      closePicker,
      onPickVariable,
    };
  },
});
</script>

<style scoped>
/* fx 按钮：悬浮于编辑盒右上角（图 1），不挤占正文排版 */
.vpk-biz-fx {
  position: absolute;
  top: 2px;
  right: 2px;
  height: 26px;
  padding: 0 6px;
  border: 1px solid var(--vpk-border, #dcdfe6);
  border-radius: 4px;
  background: #fff;
  font-size: 20px;
  font-style: italic;
  font-family: Georgia, serif;
  color: #606266;
  cursor: pointer;
  line-height: 1;
}
.vpk-biz-fx:hover {
  color: var(--vpk-primary, #409eff);
  border-color: var(--vpk-primary, #409eff);
}
</style>
