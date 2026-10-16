<template>
  <!-- 静态渲染路径（缩略图等无交互场景）：不挂 ProseMirror，白名单过滤后 v-html -->
  <div v-if="static" class="vpk-text-view ProseMirror-static" :style="containerStyle" v-html="staticHtml"></div>
  <!-- 常驻 ProseMirror 编辑器：editable 切换可编辑（无 v-if 销毁重建） -->
  <div v-else class="vpk-text-view vpk-biztext-view" :style="containerStyle" @mousedown="onMouseDown">
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
    <!-- fx 按钮（图 1）：编辑态出现，点击弹出业务变量级联选择 -->
    <button v-if="editing" type="button" class="vpk-biz-fx" title="插入业务字段" @click="togglePicker($event)">fx</button>
    <BizVarPicker
      v-if="pickerVisible"
      :variables="variables"
      :anchor="pickerAnchor"
      @select="onPickVariable"
      @close="pickerVisible = false"
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
  PptBizTextElement,
  PptBizVariableNode,
} from '@vue-ppt/core';
import { BIZ_VARIABLES_KEY, sharedEmitter } from '../emitter';
import RichEditor from './RichEditor.vue';
import BizVarPicker from './BizVarPicker.vue';

// 业务文本组件：普通文本与业务字段 tag 混排。输入 / 富文本命令与文本组件一致
// （同一 ProseMirror 内核），差异仅在于编辑态 fx 按钮与 tag 原子节点（不可编辑，退格整删）
export default Vue.extend({
  name: 'PptBizTextElement',
  components: { RichEditor, BizVarPicker },
  inject: {
    editorEmitter: { from: EDITOR_EMITTER, default: () => sharedEmitter },
    // 业务变量树（PptStage provide）；脱离 PptStage 树单独使用时为空
    bizVariables: { from: BIZ_VARIABLES_KEY, default: (): PptBizVariableNode[] => [] },
  },
  props: {
    element: { type: Object as () => PptBizTextElement, required: true },
    scale: { type: Number, default: 1 },
    editing: { type: Boolean, default: false },
    // 静态渲染（缩略图等）：不创建编辑器实例，仅输出过滤后的 HTML
    static: { type: Boolean, default: false },
  },
  data() {
    return {
      pickerVisible: false,
      // fx 按钮锚点（视口坐标）：面板挂 body 后按自身实测宽度自收敛 left
      pickerAnchor: { left: 0, top: 0 },
    };
  },
  computed: {
    // inject 的转发器（Vue 2 类型系统不将 inject 键并入 this，经 computed 收窄类型）
    emitter(): EditorEmitter {
      return ((this as any).editorEmitter as EditorEmitter) || sharedEmitter;
    },
    variables(): PptBizVariableNode[] {
      return ((this as any).bizVariables as PptBizVariableNode[]) || [];
    },
    // 容器默认样式层：与文本组件一致（PM 内容继承，元素属性修改实时生效）
    containerStyle(): Record<string, string | number> {
      const el = this.element;
      return {
        fontSize: (el.fontSize || 16) * this.scale + 'px',
        color: el.color || '#303133',
        fontFamily: el.fontFamily || 'inherit',
        fontWeight: el.bold ? 'bold' : 'normal',
        lineHeight: String(el.lineHeight || 1.4),
        textAlign: el.align || 'left',
        background: el.fill || 'transparent',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        wordBreak: 'break-word',
      };
    },
    // 静态渲染内容：与编辑态同源的白名单过滤（业务 tag 的 data-biz-tag 保留）
    staticHtml(): string {
      return sanitizeRichText(this.element.text);
    },
  },
  methods: {
    // 编辑态阻止 mousedown 冒泡（避免触发元素拖拽 + 兜住面板外点关闭判定）
    onMouseDown(e: MouseEvent) {
      if (this.editing) e.stopPropagation();
    },
    onInput(payload: { text: string; height: number }) {
      this.$emit('update', payload);
    },
    // 失焦仅回写、不退出编辑：点击 fx 弹层等导致的 blur 不结束编辑
    onBlur(payload: { text: string; height: number }) {
      if (!this.editing) return;
      this.$emit('update', payload);
    },
    commit(payload: { text: string; height: number }) {
      if (!this.editing) return;
      this.$emit('commit', payload);
    },
    onSelection(state: RichTextState) {
      this.emitter.emit(RICH_TEXT_STATE, state);
    },
    onRichTextCommand(payload: RichTextCommand) {
      if (!this.editing) return;
      if (payload.target && payload.target !== this.element.id) return;
      (this.$refs.editor as InstanceType<typeof RichEditor>)?.execCommand(payload);
    },
    // fx 弹层：锚定 fx 按钮左下角（面板挂 body，宽度自收敛由 BizVarPicker 内部处理）
    togglePicker(e: Event) {
      this.pickerVisible = !this.pickerVisible;
      if (this.pickerVisible) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        this.pickerAnchor = { left: rect.left, top: rect.bottom + 6 };
      }
    },
    // 选中变量：在当前光标处插入 tag（不可编辑原子节点，退格整体删除）
    onPickVariable(tag: { key: string; label: string }) {
      (this.$refs.editor as InstanceType<typeof RichEditor>)?.insertBizTag(tag);
      this.pickerVisible = false;
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
