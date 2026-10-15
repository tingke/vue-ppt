<template>
  <div ref="root" class="vpk-toolbar">
    <!-- Tab 行：开始 / 插入 -->
    <div class="vpk-toolbar-tabs">
      <button type="button" class="vpk-tab" :class="{ active: activeTab === 'home' }"
        @click="activeTab = 'home'">开始</button>
      <button type="button" class="vpk-tab" :class="{ active: activeTab === 'insert' }"
        @click="activeTab = 'insert'">插入</button>
    </div>

    <div class="vpk-toolbar-body" @scroll="closePopups">
      <!-- ==================== 开始：保存 / 编辑 / 字体 / 段落 / 位置 / 排列 ==================== -->
      <div v-if="activeTab === 'home'" class="vpk-tool-groups">
        <!-- 保存 -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items">
            <button type="button" class="vpk-icon-btn" title="保存" @click="$emit('save')">
              <span class="vpk-icon" v-html="icons.save"></span>
            </button>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 编辑：复制 / 粘贴 -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items">
            <button type="button" class="vpk-icon-btn" title="复制" :disabled="!selectedEl" @click="copyToClipboard">
              <span class="vpk-icon" v-html="icons.copy"></span>
            </button>
            <button type="button" class="vpk-icon-btn" title="粘贴" :disabled="!hasClipboard" @click="pasteFromClipboard">
              <span class="vpk-icon" v-html="icons.paste"></span>
            </button>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 字体：字体 / 填充色 / 字号 / 字体颜色 / 加粗（仅文本元素可用） -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items" :class="{ disabled: !isTextSelected }">
            <select class="vpk-select font-select" title="字体" :disabled="!isTextSelected" :value="displayState.fontName"
              @change="onFontNameChange($event.target.value)">
              <option value="">字体</option>
              <option v-for="f in fontFamilies" :key="f.label" :value="f.value" :style="{ fontFamily: f.value }">{{
                f.label }}</option>
            </select>

            <div class="vpk-tool-anchor">
              <button type="button" class="vpk-color-btn" title="填充色" :disabled="!isTextSelected"
                :class="{ active: colorAnchor === 'fill' }" @mousedown.prevent
                @click="toggleColorPicker('fill', $event)">
                <span class="vpk-color-icon">
                  <span class="vpk-icon" v-html="icons.fill"></span>
                  <i class="vpk-color-block" :style="{ background: (textEl && textEl.fill) || 'transparent' }" />
                </span>
              </button>
              <ColorPopup
                v-if="colorAnchor === 'fill'"
                :popup-style="colorPopupStyle"
                :current-color="currentColor"
                show-none
                @select="applyColor"
              />
            </div>

            <select class="vpk-select size-select" title="字号" :disabled="!isTextSelected" :value="displayState.fontSize"
              @change="onFontSizeChange($event.target.value)">
              <option value="">字号</option>
              <option v-for="s in fontSizes" :key="s" :value="s">{{ s }}</option>
            </select>

            <div class="vpk-tool-anchor">
              <button type="button" class="vpk-color-btn" title="字体颜色" :disabled="!isTextSelected"
                :class="{ active: colorAnchor === 'fontColor' }" @mousedown.prevent
                @click="toggleColorPicker('fontColor', $event)">
                <span class="vpk-color-icon">
                  <span class="vpk-icon" v-html="icons.text"></span>
                  <i class="vpk-color-block" :style="{ background: displayState.foreColor || fontColorValue }" />
                </span>
              </button>
              <ColorPopup
                v-if="colorAnchor === 'fontColor'"
                :popup-style="colorPopupStyle"
                :current-color="currentColor"
                @select="applyColor"
              />
            </div>

            <button type="button" class="vpk-icon-btn bold-btn" title="加粗" :disabled="!isTextSelected"
              :class="{ active: displayState.bold }" @mousedown.prevent @click="onBoldClick">B</button>
            <!-- 编辑态：作用于选中文字（富文本）；非编辑态禁用 -->
            <button type="button" class="vpk-icon-btn italic-btn" title="斜体" :disabled="!isEditingText"
              :class="{ active: displayState.italic }" @mousedown.prevent @click="execRichText('italic')">I</button>
            <button type="button" class="vpk-icon-btn underline-btn" title="下划线" :disabled="!isEditingText"
              :class="{ active: displayState.underline }" @mousedown.prevent @click="execRichText('underline')">U</button>
            <button type="button" class="vpk-icon-btn strike-btn" title="删除线" :disabled="!isEditingText"
              :class="{ active: displayState.strikeThrough }" @mousedown.prevent @click="execRichText('strikeThrough')">S</button>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 段落：对齐 / 行距（仅文本元素可用），图标数据取 core ALIGN_ICONS -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items" :class="{ disabled: !isTextSelected }">
            <button v-for="a in alignOptions" :key="a.value" type="button" class="vpk-icon-btn" :title="a.label"
              :disabled="!isTextSelected" :class="{ active: currentAlign === a.value }"
              @click="updateText({ align: a.value })">
              <span class="vpk-icon" v-html="alignIcons[a.value]"></span>
            </button>

            <select class="vpk-select lineheight-select" title="行距" :disabled="!isTextSelected" :value="lineHeightValue"
              @change="updateText({ lineHeight: Number($event.target.value) || undefined })">
              <option value="">行距</option>
              <option v-for="lh in lineHeights" :key="lh" :value="lh">{{ lh }}倍</option>
            </select>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 位置：距左侧 / 距顶部 / 宽度 / 高度 -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items" :class="{ disabled: !selectedEl }">
            <div class="vpk-pos-grid">
              <label><span class="vpk-pos-label">距左侧</span><input type="number" :disabled="!selectedEl"
                  :value="selectedEl ? selectedEl.x : ''" @change="updatePosition('x', $event)"></label>
              <label><span class="vpk-pos-label">距顶部</span><input type="number" :disabled="!selectedEl"
                  :value="selectedEl ? selectedEl.y : ''" @change="updatePosition('y', $event)"></label>
              <label><span class="vpk-pos-label">宽度</span><input type="number" min="20" :disabled="!selectedEl"
                  :value="selectedEl ? selectedEl.width : ''" @change="updatePosition('width', $event)"></label>
              <label><span class="vpk-pos-label">高度</span><input type="number" min="20" :disabled="!selectedEl"
                  :value="selectedEl ? selectedEl.height : ''" @change="updatePosition('height', $event)"></label>
            </div>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 排列：上移一层 / 置于顶层 / 下移一层 / 置于底层，图标数据取 core ORDER_ICONS -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items" :class="{ disabled: !selectedEl }">
            <button v-for="o in orderOptions" :key="o.command" type="button" class="vpk-icon-btn" :title="o.label"
              :disabled="!selectedEl" @click="orderBy(o.command)">
              <span class="vpk-icon" v-html="orderIcons[o.command]"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- ==================== 插入：幻灯片 / 背景 / 组件（图标数据取 core TOOLBAR_ICONS） ==================== -->
      <div v-else class="vpk-tool-groups">
        <!-- 幻灯片 -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items">
            <button type="button" class="vpk-tool-btn" title="新建幻灯片" @click="createSlide">
              <span class="vpk-icon" v-html="icons.slide"></span>
              <span>新建幻灯片</span>
            </button>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 背景 -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items">
            <button type="button" class="vpk-tool-btn" title="设置当前页背景图片" @click="openBgDialog">
              <span class="vpk-icon" v-html="icons.image"></span>
              <span>背景图片</span>
            </button>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 组件：文本 / 图片 / 表格（表格沿用 10x10 选择器 + 自定义行列） -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items">
            <button type="button" class="vpk-tool-btn" title="插入文本" @click="insertTextElement">
              <span class="vpk-icon" v-html="icons.text"></span>
              <span>文本</span>
            </button>

            <button type="button" class="vpk-tool-btn" title="插入图片" @click="triggerImagePick">
              <span class="vpk-icon" v-html="icons.image"></span>
              <span>图片</span>
            </button>

            <div class="vpk-tool-anchor">
              <button type="button" class="vpk-tool-btn" title="插入表格" :class="{ active: tablePickerVisible }"
                @click="toggleTablePicker($event)">
                <span class="vpk-icon" v-html="icons.table"></span>
                <span>表格</span>
              </button>

              <!-- 参考 PPTist TableGenerator：10x10 网格悬停选择行列，支持自定义输入 -->
              <TablePicker
                v-if="tablePickerVisible"
                :popup-style="tablePopupStyle"
                :doc="doc"
                @insert="emitInsert"
                @close="closeTablePicker"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 背景图片图库弹窗：上传多张进列表，支持多选，确定后按选择顺序插入为底层图片层（可拖动/缩放） -->
    <BgGalleryDialog :visible="bgDialogVisible" :doc="doc" @confirm="onBgConfirm" @close="bgDialogVisible = false" />

    <input ref="imageInput" type="file" accept="image/*" class="vpk-file-input" @change="onImageFileChange" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import {
  ALIGN_ICONS,
  ALIGN_OPTIONS,
  EDITOR_EMITTER,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_HEIGHTS,
  ORDER_ICONS,
  ORDER_OPTIONS,
  RICH_TEXT_COMMAND,
  RICH_TEXT_STATE,
  TOOLBAR_ICONS,
  createImageElement,
  createTextElement,
  readFileAsImage,
  stripRichTextStyle,
  EditorEmitter,
  PptDocumentModel,
  PptElementModel,
  PptImageElement,
  PptTextAlign,
  PptTextElement,
  RichTextState,
} from '@vue-ppt-kit/core';
import { useSlides } from './useSlides';
import { sharedEmitter } from './emitter';
import ColorPopup from './toolbar/ColorPopup.vue';
import TablePicker from './toolbar/TablePicker.vue';
import BgGalleryDialog from './toolbar/BgGalleryDialog.vue';

export type SlidesState = ReturnType<typeof useSlides>;

// Ribbon 工具栏（参考 PPTist CanvasTool + Toolbar 的分组布局），编辑操作直接调用 useSlides 状态
export default Vue.extend({
  name: 'PptToolbar',
  components: { ColorPopup, TablePicker, BgGalleryDialog },
  // 编辑器实例级事件转发器（PptStage provide 注入）：多编辑器实例互不串扰；
  // 兜底 sharedEmitter 供脱离 PptStage 树单独使用 Toolbar 的场景
  inject: {
    editorEmitter: { from: EDITOR_EMITTER, default: () => sharedEmitter },
  },
  props: {
    doc: { type: Object as () => PptDocumentModel, required: true },
    /** useSlides 返回值，供开始 tab 的编辑 / 排列等操作直接调用 */
    state: { type: Object as () => SlidesState, default: undefined },
  },
  data() {
    return {
      activeTab: 'home' as 'home' | 'insert',
      tablePickerVisible: false,
      // 颜色弹层锚点（null 为收起）
      colorAnchor: null as null | 'fill' | 'fontColor',
      // 弹层用 fixed 定位（相对视口），避免被工具栏的横向滚动容器裁剪
      colorPopupStyle: {} as Record<string, string>,
      tablePopupStyle: {} as Record<string, string>,
      // 背景图片图库弹窗显隐（上传与多选逻辑在 BgGalleryDialog 内）
      bgDialogVisible: false,
      // 编辑态光标处富文本状态（RICH_TEXT_STATE 回显）
      richtextState: null as RichTextState | null,
      // 供模板渲染的静态配置（候选项由 core 预设共享，双端一致）
      fontFamilies: FONT_FAMILIES,
      fontSizes: FONT_SIZES,
      lineHeights: LINE_HEIGHTS,
      alignOptions: ALIGN_OPTIONS,
      orderOptions: ORDER_OPTIONS,
      // 工具栏图标：core 以 SVG 文件单源维护（构建时内联为字符串），双端共用
      icons: TOOLBAR_ICONS,
      alignIcons: ALIGN_ICONS,
      orderIcons: ORDER_ICONS,
    };
  },
  computed: {
    // inject 的转发器（Vue 2 类型系统不将 inject 键并入 this，经 computed 收窄类型）
    emitter(): EditorEmitter {
      return ((this as any).editorEmitter as EditorEmitter) || sharedEmitter;
    },
    selectedEl(): PptElementModel | null {
      // SlidesState.selectedElement 为无参 computed 类型（value 退化），此处显式收窄
      return ((this.state && this.state.selectedElement.value) || null) as PptElementModel | null;
    },
    textEl(): PptTextElement | null {
      return this.selectedEl && this.selectedEl.type === 'text' ? (this.selectedEl as PptTextElement) : null;
    },
    isTextSelected(): boolean {
      return !!this.textEl;
    },
    // 文本元素是否处于编辑态：编辑态下的格式命令作用于选中文字（富文本），否则作用于整元素
    isEditingText(): boolean {
      const state = this.state as any;
      return !!(this.selectedEl && state && state.editingElementId.value === this.selectedEl.id);
    },
    // 下拉与色块的显示值：编辑态跟随光标处样式（mark 回显），非编辑态取元素属性
    displayState(): { fontName: string; fontSize: string; foreColor: string; bold: boolean; italic: boolean; underline: boolean; strikeThrough: boolean } {
      const rt = this.richtextState as RichTextState | null;
      const el = this.textEl;
      const isEditing = this.isEditingText;
      return {
        fontName: (isEditing ? rt && rt.fontName : el && el.fontFamily) || (el && el.fontFamily) || '',
        fontSize: isEditing
          ? (rt && rt.fontSize) || ''
          : el && el.fontSize
            ? String(el.fontSize)
            : '',
        foreColor: (isEditing ? rt && rt.foreColor : el && el.color) || '',
        bold: isEditing ? !!(rt && rt.bold) : !!(el && el.bold),
        // 斜体/下划线/删除线仅存在于富文本 mark（无元素级属性）：非编辑态恒为 false
        italic: isEditing ? !!(rt && rt.italic) : false,
        underline: isEditing ? !!(rt && rt.underline) : false,
        strikeThrough: isEditing ? !!(rt && rt.strikeThrough) : false,
      };
    },
    hasClipboard(): boolean {
      return !!(this.state && this.state.clipboard.value);
    },
    fontFamilyValue(): string {
      return (this.textEl && this.textEl.fontFamily) || '';
    },
    fontSizeValue(): string | number {
      return (this.textEl && this.textEl.fontSize) || '';
    },
    lineHeightValue(): string | number {
      return (this.textEl && this.textEl.lineHeight) || '';
    },
    fillColor(): string {
      return (this.textEl && this.textEl.fill) || 'transparent';
    },
    fontColorValue(): string {
      return (this.textEl && this.textEl.color) || '#303133';
    },
    currentAlign(): PptTextAlign {
      return (this.textEl && this.textEl.align) || 'left';
    },
    currentColor(): string {
      if (this.colorAnchor === 'fill') return (this.textEl && this.textEl.fill) || '#ffffff';
      if (this.colorAnchor === 'fontColor') return (this.textEl && this.textEl.color) || '#303133';
      return '#000000';
    },
  },
  mounted() {
    // 捕获阶段监听：画布元素的 mousedown 会 stopPropagation，冒泡监听将收不到事件
    document.addEventListener('mousedown', this.onOutsideClick, true);
    // 编辑态光标处富文本状态回显
    this.emitter.on<RichTextState>(RICH_TEXT_STATE, this.onRichtextState);
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onOutsideClick, true);
    this.emitter.off<RichTextState>(RICH_TEXT_STATE, this.onRichtextState);
  },
  methods: {
    // ==================== 编辑（复制 / 粘贴 / 新建 / 排列） ====================
    copyToClipboard() {
      if (!this.state || !this.selectedEl) return;
      // 复制：暂存到内部剪贴板（参考 PPTist mainStore clipboard），不动画布
      this.state.setClipboard(this.selectedEl.id);
    },
    pasteFromClipboard() {
      if (!this.state) return;
      // 粘贴：克隆剪贴板元素插入当前页
      this.state.pasteElement();
    },
    createSlide() {
      if (!this.state) return;
      this.state.createSlide();
    },
    orderBy(command: 'up' | 'top' | 'down' | 'bottom') {
      if (!this.state || !this.selectedEl) return;
      this.state.orderElement(this.selectedEl.id, command);
    },

    // ==================== 字体 / 段落 ====================
    // 更新选中文本元素的属性
    updateText(patch: Partial<PptTextElement>) {
      const el = this.textEl;
      if (!el || !this.state) return;
      this.state.updateElement(el.id, patch);
    },
    // 富文本命令：编辑态下作用于选中文字（参考 PPTist RICH_TEXT_COMMAND 事件）
    // 携带 target（元素 id），编辑器侧仅响应自身元素，防止命令误投递
    // 模板上 @mousedown.prevent 保持编辑区焦点与选区
    execRichText(command: string, value?: string) {
      const el = this.textEl;
      if (!el) return;
      this.emitter.emit(RICH_TEXT_COMMAND, { command, value, target: el.id });
    },
    // 编辑态光标状态回显（编辑器 selection 事件 → 工具栏按钮/下拉）
    onRichtextState(state: RichTextState) {
      this.richtextState = state;
    },
    // 字体：编辑态作用于选中文字（富文本 mark），非编辑态作用于整元素
    // 非编辑态先清除内联 font-family，避免已富文本设置的内联样式压过元素级属性
    onFontNameChange(value: string) {
      if (this.isEditingText) {
        this.execRichText('fontName', value || undefined);
        return;
      }
      const el = this.textEl;
      if (!el) return;
      this.updateText({ text: stripRichTextStyle(el.text, ['font-family']), fontFamily: value || undefined });
    },
    // 字号：编辑态选区级字号 mark，非编辑态元素级字号（同样先清内联 font-size）
    onFontSizeChange(value: string) {
      if (this.isEditingText) {
        this.execRichText('fontSize', value || undefined);
        return;
      }
      const el = this.textEl;
      if (!el) return;
      this.updateText({ text: stripRichTextStyle(el.text, ['font-size']), fontSize: Number(value) || undefined });
    },
    // 加粗：编辑态富文本命令；非编辑态清除内联字重后切换整元素加粗
    // （否则已富文本加粗的内联 span 会压过元素级 bold，表现为"点了没变化"）
    onBoldClick() {
      if (this.isEditingText) {
        this.execRichText('bold');
        return;
      }
      const el = this.textEl;
      if (!el) return;
      this.updateText({ text: stripRichTextStyle(el.text, ['font-weight']), bold: !el.bold });
    },
    // 依据触发按钮位置计算弹层坐标（fixed 定位），超出视口右缘时向左收敛
    anchorPopupStyle(e: Event, width: number): Record<string, string> {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      return { left: left + 'px', top: rect.bottom + 6 + 'px' };
    },
    // 工具栏横向滚动时收起弹层，避免弹层与触发按钮错位
    closePopups() {
      this.colorAnchor = null;
      this.closeTablePicker();
    },
    toggleColorPicker(anchor: 'fill' | 'fontColor', e: Event) {
      this.colorAnchor = this.colorAnchor === anchor ? null : anchor;
      if (this.colorAnchor) this.colorPopupStyle = this.anchorPopupStyle(e, 196);
    },
    applyColor(color: string) {
      // 填充色始终作用于文本框；字体颜色在编辑态作用于选中文字（富文本）
      if (this.colorAnchor === 'fill') this.updateText({ fill: color });
      else if (this.colorAnchor === 'fontColor') {
        const el = this.textEl;
        if (!el) return;
        if (this.isEditingText) {
          this.execRichText('foreColor', color);
        } else {
          // 非编辑态作用于整元素：先清除内联 color（否则内联 span 压过元素级颜色）
          this.updateText({ text: stripRichTextStyle(el.text, ['color']), color });
        }
      }
    },

    // ==================== 位置 ====================
    // 位置输入 change 时写回（宽高最小 20，与画布 MIN_SIZE 一致）
    updatePosition(key: 'x' | 'y' | 'width' | 'height', e: Event) {
      const el = this.selectedEl;
      if (!el || !this.state) return;
      const v = Math.round(Number((e.target as HTMLInputElement).value));
      if (!Number.isFinite(v)) return;
      const value = key === 'width' || key === 'height' ? Math.max(20, v) : v;
      this.state.updateElement(el.id, { [key]: value } as Partial<PptElementModel>);
    },

    // ==================== 插入（参考 PPTist CanvasTool 的 add-element-handler） ====================
    // 元素默认尺寸 / 样式 / 位置由 core 工厂统一维护，双端插入行为一致

    emitInsert(element: PptElementModel) {
      this.$emit('insert', element);
    },
    insertTextElement() {
      this.emitInsert(createTextElement(this.doc));
    },
    triggerImagePick() {
      (this.$refs.imageInput as HTMLInputElement).click();
    },
    async onImageFileChange(e: Event) {
      const input = e.target as HTMLInputElement;
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      try {
        const { src, img } = await readFileAsImage(file);
        this.emitInsert(createImageElement(src, img, this.doc));
      } catch {
        // 文件读取或图片解码失败：忽略，不插入
      }
    },

    // 背景图片图库弹窗：上传与多选逻辑在 BgGalleryDialog 内，
    // 确定后按选择顺序插入为底层图片层（可拖动/缩放）
    openBgDialog() {
      this.bgDialogVisible = true;
    },
    onBgConfirm(elements: PptImageElement[]) {
      for (const el of elements) {
        this.emitInsert(el);
        // 置于底层，作为背景图片层（普通图片元素，可拖动/缩放）
        if (this.state) this.state.orderElement(el.id, 'bottom');
      }
    },

    // 表格选择器：网格 / 自定义行列与元素构造在 TablePicker 内
    toggleTablePicker(e: Event) {
      this.tablePickerVisible = !this.tablePickerVisible;
      if (this.tablePickerVisible) this.tablePopupStyle = this.anchorPopupStyle(e, 224);
    },
    closeTablePicker() {
      this.tablePickerVisible = false;
    },

    // 点击「打开中的弹层及其触发按钮」之外时收起：
    // 包括工具栏内其他区域、画布与页面任意位置（捕获阶段监听，画布元素 stopPropagation 也不影响）
    onOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      // 打开中的弹层与其触发按钮视为「内部」：点击它们由各自的 toggle/选择逻辑处理
      const popup = this.tablePickerVisible
        ? (this.$el as HTMLElement).querySelector('.vpk-table-picker')
        : this.colorAnchor
          ? (this.$el as HTMLElement).querySelector('.vpk-color-popup')
          : null;
      if (popup) {
        const anchor = popup.closest('.vpk-tool-anchor');
        if (anchor && anchor.contains(target)) return;
      }
      if (this.colorAnchor) this.colorAnchor = null;
      if (this.tablePickerVisible) this.closeTablePicker();
    },
  },
});
</script>

<style scoped>
.vpk-toolbar {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-bottom: 1px solid var(--vpk-border, #ebeef5);
  flex-shrink: 0;
  box-sizing: border-box;
  user-select: none;
}

/* Tab 行 */
.vpk-toolbar-tabs {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 4px 10px 0;
  border-bottom: 1px solid var(--vpk-border, #ebeef5);
}

.vpk-tab {
  position: relative;
  height: 28px;
  padding: 0 16px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
}

.vpk-tab:hover {
  color: var(--vpk-primary, #409eff);
}

.vpk-tab.active {
  color: var(--vpk-primary, #409eff);
  font-weight: 600;
}

.vpk-tab.active::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: -1px;
  height: 2px;
  background: var(--vpk-primary, #409eff);
  border-radius: 1px;
}

/* 功能行：分组布局（参考 PowerPoint ribbon 的分区形式）；窄屏时功能区横向滚动 */
.vpk-toolbar-body {
  display: flex;
  overflow-x: auto;
}

.vpk-tool-groups {
  display: flex;
  align-items: stretch;
  padding: 4px 10px;
  gap: 2px;
  /* 固定功能行高度（开始 tab 的位置 2x2 输入网格为最高项）：开始/插入切换时工具栏总高一致，避免画布抖动 */
  min-height: 55px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.vpk-tool-group {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 6px;
}

.vpk-group-items {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.vpk-group-items.disabled {
  opacity: 0.75;
}

.vpk-group-divider {
  width: 1px;
  margin: 4px 2px;
  background: var(--vpk-border, #ebeef5);
}

/* 视觉隐藏但保持可访问的文件选择框 */
.vpk-file-input {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 1px;
  height: 1px;
  opacity: 0.01;
  border: none;
  padding: 0;
}

.vpk-tool-anchor {
  position: relative;
  display: flex;
}

/* 图标容器：SVG 字符串经 v-html 内联（不带 scoped 标记），::v-deep 穿透设置尺寸 */
.vpk-icon {
  display: flex;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.vpk-icon ::v-deep svg {
  display: block;
  width: 100%;
  height: 100%;
}

.vpk-tool-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
}

.vpk-tool-btn:hover,
.vpk-tool-btn.active {
  background: #f5f7fa;
  color: var(--vpk-primary, #409eff);
}

/* 图标按钮（加粗 / 对齐 / 排列 / 复制粘贴等）：图标统一 20px */
.vpk-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
  font-size: 14px;
}

.vpk-icon-btn:hover {
  background: #f5f7fa;
  color: var(--vpk-primary, #409eff);
}

.vpk-icon-btn.active {
  background: rgba(64, 158, 255, 0.12);
  color: var(--vpk-primary, #409eff);
}

.vpk-icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  background: transparent;
  color: #606266;
}

.bold-btn {
  font-weight: 800;
  font-size: 15px;
  font-family: Georgia, serif;
}

.italic-btn {
  font-style: italic;
  font-weight: 600;
  font-family: Georgia, serif;
}

.underline-btn {
  text-decoration: underline;
  font-weight: 600;
}

.strike-btn {
  text-decoration: line-through;
  font-weight: 600;
}

/* 下拉选择：高度与 26px 图标按钮同行对齐 */
.vpk-select {
  height: 26px;
  padding: 0 4px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  box-sizing: border-box;
}

.vpk-select:focus {
  outline: none;
  border-color: var(--vpk-primary, #409eff);
}

.vpk-select:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.font-select {
  width: 88px;
}

.size-select {
  width: 56px;
}

.lineheight-select {
  width: 62px;
}

/* 颜色按钮：图标 + 当前色块（参考 PPTist ColorButton） */
.vpk-color-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
}

.vpk-color-btn:hover,
.vpk-color-btn.active {
  background: #f5f7fa;
}

.vpk-color-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.vpk-color-icon {
  position: relative;
  display: flex;
  width: 20px;
  height: 20px;
}

.vpk-color-block {
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 0;
  height: 5px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}

/* 位置：2x2 数字输入 */
.vpk-pos-grid {
  display: grid;
  grid-template-columns: auto auto;
  gap: 3px 8px;
  align-items: center;
}

.vpk-pos-grid label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
}

/* 标签文字固定 3em 并两端对齐：2 字/3 字标签等宽，上下两行输入框纵向对齐 */
.vpk-pos-grid .vpk-pos-label {
  display: inline-block;
  width: 3em;
  text-align: justify;
  text-align-last: justify;
}

.vpk-pos-grid input {
  width: 54px;
  height: 22px;
  padding: 0 4px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  box-sizing: border-box;
}

.vpk-pos-grid input:focus {
  outline: none;
  border-color: var(--vpk-primary, #409eff);
}

.vpk-pos-grid input:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
