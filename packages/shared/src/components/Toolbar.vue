<template>
  <!-- Ribbon 工具栏（分组布局），编辑操作直接调用 useSlides 状态
       （vue2 / vue3 双端共享，P1-3：普通 defineComponent + setup()） -->
  <div ref="rootRef" class="vpk-toolbar">
    <!-- Tab 行：开始 / 插入 -->
    <div class="vpk-toolbar-tabs">
      <button type="button" class="vpk-tab" :class="{ active: activeTab === 'home' }"
        @click="switchTab('home')">开始</button>
      <button type="button" class="vpk-tab" :class="{ active: activeTab === 'insert' }"
        @click="switchTab('insert')">插入</button>
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

        <!-- 编辑：撤销 / 重做 / 复制 / 粘贴 / 标尺 / 参考线 -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items">
            <button type="button" class="vpk-icon-btn" title="撤销" :disabled="!state || !state.canUndo.value" @click="onUndo">
              <span class="vpk-icon" v-html="icons.undo"></span>
            </button>
            <button type="button" class="vpk-icon-btn" title="重做" :disabled="!state || !state.canRedo.value" @click="onRedo">
              <span class="vpk-icon" v-html="icons.redo"></span>
            </button>
            <button type="button" class="vpk-icon-btn" title="复制" :disabled="!selectedEl" @click="copyToClipboard">
              <span class="vpk-icon" v-html="icons.copy"></span>
            </button>
            <button type="button" class="vpk-icon-btn" title="粘贴" :disabled="!hasClipboard" @click="pasteFromClipboard">
              <span class="vpk-icon" v-html="icons.paste"></span>
            </button>

            <!-- 编辑辅助：标尺 / 参考线显隐（状态在 useSlides，画布容器消费） -->
            <button type="button" class="vpk-icon-btn" title="标尺" :disabled="!state" :class="{ active: state && state.showRuler.value }" @click="toggleRuler">
              <span class="vpk-icon" v-html="icons.ruler"></span>
            </button>
            <button type="button" class="vpk-icon-btn" title="参考线" :disabled="!state" :class="{ active: state && state.showGuides.value }" @click="toggleGuides">
              <span class="vpk-icon" v-html="icons.guide"></span>
            </button>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 字体：字体 / 填充色 / 字号 / 字体颜色 / 加粗（仅文本元素可用） -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items" :class="{ disabled: !isTextSelected }">
            <select class="vpk-select font-select" title="字体" :disabled="!isTextSelected" :value="displayState.fontName"
              @change="onFontNameChange($event)">
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
              @change="onFontSizeChange($event)">
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
              @change="onLineHeightChange($event)">
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
        <!-- 幻灯片：点击弹出类型下拉（自定义页 / 特殊点位页（循环）/ 点位页（循环）） -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items">
            <div class="vpk-tool-anchor">
              <button type="button" class="vpk-tool-btn" title="新建幻灯片"
                :class="{ active: slideTypeMenuVisible }" @click="toggleSlideTypeMenu($event)">
                <span class="vpk-icon" v-html="icons.slide"></span>
                <span>新建幻灯片</span>
                <i class="vpk-caret-down" />
              </button>

              <div v-if="slideTypeMenuVisible" class="vpk-slide-type-menu" :style="slideTypePopupStyle">
                <div v-for="t in slideTypes" :key="t.value" class="vpk-slide-type-item" @click="onCreateSlide(t.value)">
                  {{ t.label }}
                </div>
              </div>
            </div>
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

        <!-- 业务组件：媒体 / 业务文本 -->
        <div class="vpk-tool-group">
          <div class="vpk-group-items">
            <button type="button" class="vpk-tool-btn" title="插入富文本（支持业务字段混排）" @click="insertBizTextElement">
              <span class="vpk-icon" v-html="icons.text"></span>
              <span>文本</span>
            </button>

            <button type="button" class="vpk-tool-btn" title="插入照片" @click="insertMediaElement">
              <span class="vpk-icon" v-html="icons.image"></span>
              <span>照片</span>
            </button>

            <div class="vpk-tool-anchor">
              <button type="button" class="vpk-tool-btn" title="插入表格（单元格支持业务字段混排）" :class="{ active: bizTablePickerVisible }" @click="toggleBizTablePicker($event)">
                <span class="vpk-icon" v-html="icons.table"></span>
                <span>表格</span>
              </button>

              <!-- 与表格共用行列选择器（biz 模式构造 bizTable 元素） -->
              <TablePicker
                v-if="bizTablePickerVisible"
                :popup-style="bizTablePopupStyle"
                :doc="doc"
                biz
                @insert="emitInsert"
                @close="closeBizTablePicker"
              />
            </div>
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

              <!-- 10x10 网格悬停选择行列，支持自定义输入 -->
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
    <BgGalleryDialog :visible="bgDialogVisible" :doc="doc" @confirm="onBgConfirm" @close="closeBgDialog" />

    <input ref="imageInputRef" type="file" accept="image/*" class="vpk-file-input" @change="onImageFileChange" />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject, onBeforeUnmount, onMounted, ref } from '@vpk/vue-api';
import type { PropType } from '@vpk/vue-api';
import {
  ALIGN_ICONS,
  ALIGN_OPTIONS,
  EDITOR_EMITTER,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_HEIGHTS,
  MIN_SIZE,
  ORDER_ICONS,
  ORDER_OPTIONS,
  RICH_TEXT_COMMAND,
  RICH_TEXT_STATE,
  SLIDE_TYPES,
  TOOLBAR_ICONS,
  DEFAULT_TEXT_COLOR,
  createBizTextElement,
  createImageElement,
  createMediaElement,
  createTextElement,
  readFileAsImage,
  stripRichTextStyle,
} from '@tthappy/ppt-core';
import type { EditorEmitter, PptDocumentModel, PptElementModel, PptImageElement, PptSlideType, PptTextAlign, PptTextElement, RichTextState } from '@tthappy/ppt-core';
import { sharedEmitter } from '../emitter';
import { useToolbarPopups } from '../useToolbarPopups';
import { useSlides } from '../useSlides';
import ColorPopup from './toolbar/ColorPopup.vue';
import TablePicker from './toolbar/TablePicker.vue';
import BgGalleryDialog from './toolbar/BgGalleryDialog.vue';

type SlidesState = ReturnType<typeof useSlides>;

export default defineComponent({
  name: 'PptToolbar',
  components: { ColorPopup, TablePicker, BgGalleryDialog },
  props: {
    doc: { type: Object as PropType<PptDocumentModel>, required: true },
    /** useSlides 返回值，供开始 tab 的编辑 / 排列等操作直接调用 */
    state: { type: Object as PropType<SlidesState>, default: undefined },
  },
  emits: ['insert', 'save'],
  setup(props, { emit }) {
    // 编辑器实例级事件转发器（编辑器 provide 注入）：多编辑器实例互不串扰；
    // 兜底 sharedEmitter 供脱离编辑器树单独使用 Toolbar 的场景
    const emitter = inject<EditorEmitter>(EDITOR_EMITTER, sharedEmitter);

    // 注意：此 computed 不 return——setup 返回与 prop 同名的 state 会在 vue2.7 触发
    // 「setup binding property "state" is already declared as a prop」告警；
    // 模板中的 state 直接解析到 prop（同一对象引用，双端行为一致）
    const state = computed(() => props.state);
    const selectedEl = computed<PptElementModel | null>(() => (state.value && state.value.selectedElement.value) || null);
    const textEl = computed<PptTextElement | null>(() => {
      const el = selectedEl.value;
      // 业务文本与文本元素样式字段一致：字体/段落等样式操作复用文本逻辑
      return el && (el.type === 'text' || el.type === 'bizText') ? (el as unknown as PptTextElement) : null;
    });
    const isTextSelected = computed(() => !!textEl.value);
    // 文本元素是否处于编辑态：编辑态下的格式命令作用于选中文字（富文本），否则作用于整元素
    const isEditingText = computed(() => !!(selectedEl.value && state.value && state.value.editingElementId.value === selectedEl.value.id));
    const hasClipboard = computed(() => !!(state.value && state.value.clipboard.value));

    // 编辑态光标处富文本状态（RICH_TEXT_STATE 回显）
    const richtextState = ref<RichTextState | null>(null);

    // 下拉与色块的显示值：编辑态跟随光标处样式（mark 回显），非编辑态取元素属性
    const displayState = computed(() => {
      const rt = richtextState.value;
      const el = textEl.value;
      const isEditing = isEditingText.value;
      return {
        fontName: (isEditing ? rt && rt.fontName : el && el.fontFamily) ?? (el && el.fontFamily) ?? '',
        fontSize: isEditing
          ? (rt && rt.fontSize) ?? ''
          : el && el.fontSize
            ? String(el.fontSize)
            : '',
        foreColor: (isEditing ? rt && rt.foreColor : el && el.color) ?? '',
        bold: isEditing ? !!(rt && rt.bold) : !!(el && el.bold),
        // 斜体/下划线/删除线仅存在于富文本 mark（无元素级属性）：非编辑态恒为 false
        italic: isEditing ? !!(rt && rt.italic) : false,
        underline: isEditing ? !!(rt && rt.underline) : false,
        strikeThrough: isEditing ? !!(rt && rt.strikeThrough) : false,
      };
    });

    const lineHeightValue = computed<string | number>(() => (textEl.value && textEl.value.lineHeight) ?? '');
    const fontColorValue = computed(() => (textEl.value && textEl.value.color) ?? DEFAULT_TEXT_COLOR);
    const currentAlign = computed<PptTextAlign>(() => (textEl.value && textEl.value.align) ?? 'left');
    const currentColor = computed(() => {
      if (colorAnchor.value === 'fill') return (textEl.value && textEl.value.fill) ?? '#ffffff';
      if (colorAnchor.value === 'fontColor') return (textEl.value && textEl.value.color) ?? DEFAULT_TEXT_COLOR;
      return '#000000';
    });

    // ==================== 弹层状态机（table / bizTable / slideType / color，单源 composable） ====================

    const rootRef = ref<HTMLElement | null>(null);
    const popups = useToolbarPopups(() => rootRef.value);
    const {
      colorAnchor,
      colorPopupStyle,
      tablePickerVisible,
      tablePopupStyle,
      bizTablePickerVisible,
      bizTablePopupStyle,
      slideTypeMenuVisible,
      slideTypePopupStyle,
      toggleColorPicker,
      toggleTablePicker,
      closeTablePicker,
      toggleBizTablePicker,
      closeBizTablePicker,
      toggleSlideTypeMenu,
      closeSlideTypeMenu,
      closePopups,
      onOutsideClick,
    } = popups;

    // 背景图片图库弹窗显隐（上传与多选逻辑在 BgGalleryDialog 内）
    const bgDialogVisible = ref(false);
    // Tab 行：开始 / 插入
    const activeTab = ref<'home' | 'insert'>('home');

    // 供模板渲染的静态配置（候选项由 core 预设共享，双端一致）
    const fontFamilies = FONT_FAMILIES;
    const fontSizes = FONT_SIZES;
    const lineHeights = LINE_HEIGHTS;
    const alignOptions = ALIGN_OPTIONS;
    const orderOptions = ORDER_OPTIONS;
    const slideTypes = SLIDE_TYPES;
    const icons = TOOLBAR_ICONS;
    const alignIcons = ALIGN_ICONS;
    const orderIcons = ORDER_ICONS;

    // ==================== 编辑（复制 / 粘贴 / 新建 / 排列） ====================

    function copyToClipboard() {
      if (!state.value || !selectedEl.value) return;
      // 复制：暂存到内部剪贴板，不动画布
      state.value.setClipboard(selectedEl.value.id);
    }
    function pasteFromClipboard() {
      if (!state.value) return;
      // 粘贴：克隆剪贴板元素插入当前页
      state.value.pasteElement();
    }
    function onUndo() {
      if (!state.value) return;
      state.value.undo();
    }
    function onRedo() {
      if (!state.value) return;
      state.value.redo();
    }
    function switchTab(tab: 'home' | 'insert') {
      activeTab.value = tab;
    }
    // 新建幻灯片：按所选类型在当前页后新建（缺省自定义页）
    function onCreateSlide(type: PptSlideType) {
      closeSlideTypeMenu();
      if (!state.value) return;
      state.value.createSlide(type);
    }
    function orderBy(command: 'up' | 'top' | 'down' | 'bottom') {
      if (!state.value || !selectedEl.value) return;
      state.value.orderElement(selectedEl.value.id, command);
    }

    // ==================== 字体 / 段落 ====================

    // 更新选中文本元素的属性
    function updateText(patch: Partial<PptTextElement>) {
      const el = textEl.value;
      if (!el || !state.value) return;
      state.value.updateElement(el.id, patch);
    }

    // 富文本命令：编辑态下作用于选中文字
    // 携带 target（元素 id），编辑器侧仅响应自身元素，防止命令误投递
    // 模板上 @mousedown.prevent 保持编辑区焦点与选区
    function execRichText(command: string, value?: string) {
      const el = textEl.value;
      if (!el) return;
      emitter.emit(RICH_TEXT_COMMAND, { command, value, target: el.id });
    }

    // 编辑态光标状态回显（编辑器 selection 事件 → 工具栏按钮/下拉）
    function onRichTextState(s: RichTextState) {
      richtextState.value = s;
    }

    // 字体：编辑态作用于选中文字（富文本 mark），非编辑态作用于整元素
    // 非编辑态先清除内联 font-family，避免已富文本设置的内联样式压过元素级属性
    function onFontNameChange(e: Event) {
      const value = (e.target as HTMLSelectElement).value;
      if (isEditingText.value) {
        execRichText('fontName', value || undefined);
        return;
      }
      const el = textEl.value;
      if (!el) return;
      updateText({ text: stripRichTextStyle(el.text, ['font-family']), fontFamily: value || undefined });
    }

    // 字号：编辑态选区级字号 mark，非编辑态元素级字号（同样先清内联 font-size）
    function onFontSizeChange(e: Event) {
      const value = (e.target as HTMLSelectElement).value;
      if (isEditingText.value) {
        execRichText('fontSize', value || undefined);
        return;
      }
      const el = textEl.value;
      if (!el) return;
      updateText({ text: stripRichTextStyle(el.text, ['font-size']), fontSize: Number(value) || undefined });
    }

    // 行距（非编辑态元素级属性；编辑态不支持选区级行距）
    function onLineHeightChange(e: Event) {
      const value = (e.target as HTMLSelectElement).value;
      updateText({ lineHeight: Number(value) || undefined });
    }

    // 加粗：编辑态富文本命令；非编辑态清除内联字重后切换整元素加粗
    // （否则已富文本加粗的内联 span 会压过元素级 bold，表现为"点了没变化"）
    function onBoldClick() {
      if (isEditingText.value) {
        execRichText('bold');
        return;
      }
      const el = textEl.value;
      if (!el) return;
      updateText({ text: stripRichTextStyle(el.text, ['font-weight']), bold: !el.bold });
    }

    function applyColor(color: string) {
      // 填充色始终作用于文本框；字体颜色在编辑态作用于选中文字（富文本）
      if (colorAnchor.value === 'fill') updateText({ fill: color });
      else if (colorAnchor.value === 'fontColor') {
        const el = textEl.value;
        if (!el) return;
        if (isEditingText.value) {
          execRichText('foreColor', color);
        } else {
          // 非编辑态作用于整元素：先清除内联 color（否则内联 span 压过元素级颜色）
          updateText({ text: stripRichTextStyle(el.text, ['color']), color });
        }
      }
    }

    // ==================== 位置 ====================

    // 位置输入 change 时写回（宽高最小 20，与画布 MIN_SIZE 一致）
    function updatePosition(key: 'x' | 'y' | 'width' | 'height', e: Event) {
      const el = selectedEl.value;
      if (!el || !state.value) return;
      const v = Math.round(Number((e.target as HTMLInputElement).value));
      if (!Number.isFinite(v)) return;
      // 宽高下限与画布 MIN_SIZE 一致；x/y 不设边界（与拖拽 / 缩放行为一致，PPT 允许元素部分出画布）
      const value = key === 'width' || key === 'height' ? Math.max(MIN_SIZE, v) : v;
      state.value.updateElement(el.id, { [key]: value } as Partial<PptElementModel>);
    }

    // ==================== 插入 ====================
    // 元素默认尺寸 / 样式 / 位置由 core 工厂统一维护，双端插入行为一致

    function emitInsert(element: PptElementModel) {
      emit('insert', element);
    }
    function insertTextElement() {
      emitInsert(createTextElement(props.doc));
    }
    function insertBizTextElement() {
      emitInsert(createBizTextElement(props.doc));
    }
    function insertMediaElement() {
      emitInsert(createMediaElement(props.doc));
    }

    const imageInputRef = ref<HTMLInputElement | null>(null);
    function triggerImagePick() {
      const input = imageInputRef.value;
      if (input) input.click();
    }
    async function onImageFileChange(e: Event) {
      const input = e.target as HTMLInputElement;
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      try {
        const { src, img } = await readFileAsImage(file);
        emitInsert(createImageElement(src, img, props.doc));
      } catch {
        // 文件读取或图片解码失败：忽略，不插入
      }
    }

    // ==================== 背景 ====================

    // 背景图片图库弹窗：上传与多选逻辑在 BgGalleryDialog 内，
    // 确定后按选择顺序插入为底层图片层（可拖动/缩放）
    function openBgDialog() {
      bgDialogVisible.value = true;
    }
    function closeBgDialog() {
      bgDialogVisible.value = false;
    }
    function onBgConfirm(elements: PptImageElement[]) {
      for (const el of elements) {
        emitInsert(el);
        // 置于底层，作为背景图片层（普通图片元素，可拖动/缩放）
        if (state.value) state.value.orderElement(el.id, 'bottom');
      }
    }

    // 标尺 / 参考线显隐切换（编辑辅助 UI，状态在 useSlides）
    function toggleRuler() {
      if (state.value) state.value.showRuler.value = !state.value.showRuler.value;
    }
    function toggleGuides() {
      if (state.value) state.value.showGuides.value = !state.value.showGuides.value;
    }

    onMounted(() => {
      // 捕获阶段监听：画布元素的 mousedown 会 stopPropagation，冒泡监听将收不到事件
      document.addEventListener('mousedown', onOutsideClick, true);
      // 编辑态光标处富文本状态回显
      emitter.on<RichTextState>(RICH_TEXT_STATE, onRichTextState);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onOutsideClick, true);
      emitter.off<RichTextState>(RICH_TEXT_STATE, onRichTextState);
    });

    return {
      rootRef,
      selectedEl,
      textEl,
      isTextSelected,
      isEditingText,
      hasClipboard,
      displayState,
      lineHeightValue,
      fontColorValue,
      currentAlign,
      currentColor,
      colorAnchor,
      colorPopupStyle,
      tablePickerVisible,
      tablePopupStyle,
      bizTablePickerVisible,
      bizTablePopupStyle,
      slideTypeMenuVisible,
      slideTypePopupStyle,
      bgDialogVisible,
      activeTab,
      fontFamilies,
      fontSizes,
      lineHeights,
      alignOptions,
      orderOptions,
      slideTypes,
      icons,
      alignIcons,
      orderIcons,
      imageInputRef,
      copyToClipboard,
      pasteFromClipboard,
      onUndo,
      onRedo,
      switchTab,
      onCreateSlide,
      orderBy,
      updateText,
      execRichText,
      onFontNameChange,
      onFontSizeChange,
      onLineHeightChange,
      onBoldClick,
      applyColor,
      updatePosition,
      emitInsert,
      insertTextElement,
      insertBizTextElement,
      insertMediaElement,
      triggerImagePick,
      onImageFileChange,
      openBgDialog,
      closeBgDialog,
      onBgConfirm,
      toggleRuler,
      toggleGuides,
      toggleColorPicker,
      toggleTablePicker,
      closeTablePicker,
      toggleBizTablePicker,
      closeBizTablePicker,
      toggleSlideTypeMenu,
      closeSlideTypeMenu,
      closePopups,
    };
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

/* 新建幻灯片类型下拉：fixed 定位（同色板/表格弹层，避免被滚动容器裁剪） */
.vpk-slide-type-menu {
  position: fixed;
  z-index: 2100;
  min-width: 170px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  font-size: 13px;
}

.vpk-slide-type-item {
  padding: 6px 12px;
  color: #303133;
  cursor: pointer;
  white-space: nowrap;
}

.vpk-slide-type-item:hover {
  background: #f5f7fa;
  color: var(--vpk-primary, #409eff);
}

/* 下拉箭头（纯 CSS 三角，跟随文字颜色） */
.vpk-caret-down {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
}

/* 图标容器：SVG 字符串经 v-html 内联（不带 scoped 标记），:deep 穿透设置尺寸 */
.vpk-icon {
  display: flex;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.vpk-icon :deep(svg) {
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

/* 颜色按钮：图标 + 当前色块 */
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
