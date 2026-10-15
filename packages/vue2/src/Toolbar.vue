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
          <div class="vpk-group-label">保存</div>
          <div class="vpk-group-items">
            <button type="button" class="vpk-icon-btn" title="保存" @click="$emit('save')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <path d="M17 21v-8H7v8" />
                <path d="M7 3v5h8" />
              </svg>
            </button>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 编辑：复制 / 粘贴 -->
        <div class="vpk-tool-group">
          <div class="vpk-group-label">编辑</div>
          <div class="vpk-group-items">
            <button type="button" class="vpk-icon-btn" title="复制" :disabled="!selectedEl" @click="copyToClipboard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button type="button" class="vpk-icon-btn" title="粘贴" :disabled="!hasClipboard" @click="pasteFromClipboard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" />
              </svg>
            </button>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 字体：字体 / 填充色 / 字号 / 字体颜色 / 加粗（仅文本元素可用） -->
        <div class="vpk-tool-group">
          <div class="vpk-group-label">字体</div>
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                  <i class="vpk-color-block" :style="{ background: (textEl && textEl.fill) || 'transparent' }" />
                </span>
              </button>
              <div v-if="colorAnchor === 'fill'" class="vpk-color-popup" :style="colorPopupStyle">
                <div class="vpk-color-swatches">
                  <button v-for="c in palette" :key="c" type="button" class="vpk-swatch" :style="{ background: c }"
                    :title="c" @mousedown.prevent @click="applyColor(c)" />
                </div>
                <div class="vpk-color-custom">
                  <span class="vpk-color-custom-label">自定义</span>
                  <input type="color" :value="currentColor" @input="applyColor($event.target.value)" />
                  <button type="button" class="vpk-color-none" @mousedown.prevent @click="applyColor('')">无填充</button>
                </div>
              </div>
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M4 7V4h16v3" />
                    <path d="M12 4v16" />
                    <path d="M9 20h6" />
                  </svg>
                  <i class="vpk-color-block" :style="{ background: displayState.foreColor || fontColorValue }" />
                </span>
              </button>
              <div v-if="colorAnchor === 'fontColor'" class="vpk-color-popup" :style="colorPopupStyle">
                <div class="vpk-color-swatches">
                  <button v-for="c in palette" :key="c" type="button" class="vpk-swatch" :style="{ background: c }"
                    :title="c" @mousedown.prevent @click="applyColor(c)" />
                </div>
                <div class="vpk-color-custom">
                  <span class="vpk-color-custom-label">自定义</span>
                  <input type="color" :value="currentColor" @input="applyColor($event.target.value)" />
                </div>
              </div>
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

        <!-- 段落：对齐 / 行距（仅文本元素可用） -->
        <div class="vpk-tool-group">
          <div class="vpk-group-label">段落</div>
          <div class="vpk-group-items" :class="{ disabled: !isTextSelected }">
            <button v-for="a in alignOptions" :key="a.value" type="button" class="vpk-icon-btn" :title="a.label"
              :disabled="!isTextSelected" :class="{ active: currentAlign === a.value }"
              @click="updateText({ align: a.value })">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M3 5h18" />
                <path d="M3 10h18" />
                <path d="M3 15h18" />
                <path d="M3 20h18" />
                <template v-if="a.value === 'left'">
                  <path d="M3 10h10" />
                  <path d="M3 15h7" />
                </template>
                <template v-else-if="a.value === 'center'">
                  <path d="M7 10h10" />
                  <path d="M8.5 15h7" />
                </template>
                <template v-else-if="a.value === 'right'">
                  <path d="M11 10h10" />
                  <path d="M14 15h7" />
                </template>
              </svg>
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
          <div class="vpk-group-label">位置</div>
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

        <!-- 排列：上移一层 / 置于顶层 / 下移一层 / 置于底层 -->
        <div class="vpk-tool-group">
          <div class="vpk-group-label">排列</div>
          <div class="vpk-group-items" :class="{ disabled: !selectedEl }">
            <button v-for="o in orderOptions" :key="o.command" type="button" class="vpk-icon-btn" :title="o.label"
              :disabled="!selectedEl" @click="orderBy(o.command)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <rect x="4" y="14" width="16" height="7" rx="1" />
                <template v-if="o.command === 'up'">
                  <path d="M12 10V3" />
                  <path d="M8 7l4-4 4 4" />
                </template>
                <template v-else-if="o.command === 'top'">
                  <path d="M4 3h16" />
                  <path d="M12 11V6" />
                  <path d="M9 8.5L12 5.5l3 3" />
                </template>
                <template v-else-if="o.command === 'down'">
                  <path d="M12 3v7" />
                  <path d="M8 6l4 4 4-4" />
                </template>
                <template v-else>
                  <path d="M4 21h16" />
                  <path d="M12 2v5" />
                  <path d="M9 4.5l3 3 3-3" />
                </template>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ==================== 插入：幻灯片 / 背景 / 组件 ==================== -->
      <div v-else class="vpk-tool-groups">
        <!-- 幻灯片 -->
        <div class="vpk-tool-group">
          <div class="vpk-group-label">幻灯片</div>
          <div class="vpk-group-items">
            <button type="button" class="vpk-tool-btn" title="新建幻灯片" @click="createSlide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="M12 8v6" />
                <path d="M9 11h6" />
              </svg>
              <span>新建幻灯片</span>
            </button>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 背景 -->
        <div class="vpk-tool-group">
          <div class="vpk-group-label">背景</div>
          <div class="vpk-group-items">
            <button type="button" class="vpk-tool-btn" title="设置当前页背景图片" @click="openBgDialog">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>背景图片</span>
            </button>
          </div>
        </div>

        <span class="vpk-group-divider" />

        <!-- 组件：文本 / 图片 / 表格（表格沿用 10x10 选择器 + 自定义行列） -->
        <div class="vpk-tool-group">
          <div class="vpk-group-label">组件</div>
          <div class="vpk-group-items">
            <button type="button" class="vpk-tool-btn" title="插入文本" @click="insertTextElement">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M4 7V4h16v3" />
                <path d="M12 4v16" />
                <path d="M9 20h6" />
              </svg>
              <span>文本</span>
            </button>

            <button type="button" class="vpk-tool-btn" title="插入图片" @click="triggerImagePick">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>图片</span>
            </button>

            <div class="vpk-tool-anchor">
              <button type="button" class="vpk-tool-btn" title="插入表格" :class="{ active: tablePickerVisible }"
                @click="toggleTablePicker($event)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 10h18" />
                  <path d="M9 10v10" />
                  <path d="M15 10v10" />
                </svg>
                <span>表格</span>
              </button>

              <!-- 参考 PPTist TableGenerator：10x10 网格悬停选择行列，支持自定义输入 -->
              <div v-if="tablePickerVisible" class="vpk-table-picker" :style="tablePopupStyle"
                @mouseleave="endCell = []">
                <div class="vpk-table-picker-title">
                  <span>{{ isCustom ? '自定义表格' : '表格 ' + (endCell.length ? endCell[0] + ' x ' + endCell[1] : '')
                    }}</span>
                  <span class="vpk-table-picker-actions">
                    <button type="button" class="vpk-table-picker-toggle" @click="isCustom = !isCustom">{{ isCustom ?
                      '返回' :
                      '自定义' }}</button>
                    <span class="vpk-table-picker-close" @click="tablePickerVisible = false">×</span>
                  </span>
                </div>
                <div v-if="!isCustom" class="vpk-table-picker-grid">
                  <span v-for="row in 10" :key="row" class="vpk-picker-row">
                    <button v-for="col in 10" :key="col" type="button" class="vpk-picker-cell"
                      :class="{ active: endCell.length && row <= endCell[0] && col <= endCell[1] }"
                      :aria-label="row + ' 行 ' + col + ' 列'" @mouseenter="endCell = [row, col]"
                      @click="insertTableElement(row, col)" />
                  </span>
                </div>
                <div v-else class="vpk-table-custom">
                  <div class="vpk-table-custom-row">
                    <label>行数：</label>
                    <input v-model.number="customRow" type="number" min="1" max="20" />
                  </div>
                  <div class="vpk-table-custom-row">
                    <label>列数：</label>
                    <input v-model.number="customCol" type="number" min="1" max="20" />
                  </div>
                  <div class="vpk-table-custom-btns">
                    <button type="button" class="vpk-btn" @click="isCustom = false">返回</button>
                    <button type="button" class="vpk-btn primary" @click="insertCustomTable">确认</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 背景图片图库弹窗：上传多张进列表，支持多选，确定后按选择顺序插入为底层图片层（可拖动/缩放） -->
    <div v-if="bgDialogVisible" class="vpk-dialog-overlay" @mousedown.self="cancelBgDialog">
      <div class="vpk-bg-dialog">
        <div class="vpk-bg-dialog-header">
          <button type="button" class="vpk-btn" @click="triggerBgUpload">＋ 上传</button>
          <span class="vpk-dialog-close" title="关闭" @click="cancelBgDialog">×</span>
        </div>
        <div class="vpk-bg-gallery">
          <div v-if="!bgImages.length" class="vpk-bg-empty">请上传图片</div>
          <div v-for="(img, i) in bgImages" :key="i" class="vpk-bg-thumb"
            :class="{ selected: selectedBgs.indexOf(img) > -1 }" @click="toggleBgSelect(img)">
            <img :src="img" alt="" />
            <span v-if="selectedBgs.indexOf(img) > -1" class="vpk-bg-check">✓</span>
          </div>
        </div>
        <div class="vpk-bg-dialog-footer">
          <span class="vpk-bg-selected-tip">已选 {{ selectedBgs.length }} 张</span>
          <button type="button" class="vpk-btn" @click="cancelBgDialog">取消</button>
          <button type="button" class="vpk-btn primary" :disabled="!selectedBgs.length"
            @click="confirmBgDialog">确定</button>
        </div>
        <input ref="bgUploadInput" type="file" accept="image/*" multiple class="vpk-file-input" @change="onBgUpload" />
      </div>
    </div>

    <input ref="imageInput" type="file" accept="image/*" class="vpk-file-input" @change="onImageFileChange" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { PptDocumentModel, PptElementModel, PptTableCell, PptTableElement, PptTextAlign, PptTextElement, stripRichTextStyle } from '@vue-ppt-kit/core';
import { useSlides } from './useSlides';
import { emitter, RICH_TEXT_COMMAND, RICH_TEXT_STATE, RichTextCommand, RichTextState } from './emitter';

export type SlidesState = ReturnType<typeof useSlides>;

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// 常用系统字体（参考 PPTist availableFonts，仅保留系统字体）
const FONT_FAMILIES = [
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: '苹方', value: '"PingFang SC", sans-serif' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: '仿宋', value: 'FangSong, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
];
// 字号与行距候选项（参考 PPTist TextStylePanel 的 options）
const FONT_SIZES = [12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 60, 72];
const LINE_HEIGHTS = [1, 1.15, 1.2, 1.4, 1.5, 1.75, 2, 2.5, 3];
const ALIGN_OPTIONS: { label: string; value: PptTextAlign }[] = [
  { label: '左对齐', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '右对齐', value: 'right' },
  { label: '两端对齐', value: 'justify' },
];
// 预设色板（参考 PPTist ColorPicker 的主题色 + 常用色）
const PALETTE = [
  '#000000', '#262626', '#595959', '#8c8c8c', '#bfbfbf', '#d9d9d9', '#f0f0f0', '#ffffff', '#7f2b2b',
  '#303133', '#606266', '#909399', '#c0c4cc', '#409eff', '#1677ff', '#2f54eb', '#722ed1', '#eb2f96',
  '#f5222d', '#fa541c', '#fa8c16', '#fadb14', '#a0d911', '#52c41a', '#13c2c2', '#2e8b57', '#8b4513',
];
const ORDER_OPTIONS: { label: string; command: 'up' | 'top' | 'down' | 'bottom' }[] = [
  { label: '上移一层', command: 'up' },
  { label: '置于顶层', command: 'top' },
  { label: '下移一层', command: 'down' },
  { label: '置于底层', command: 'bottom' },
];

// Ribbon 工具栏（参考 PPTist CanvasTool + Toolbar 的分组布局），编辑操作直接调用 useSlides 状态
export default Vue.extend({
  name: 'PptToolbar',
  props: {
    doc: { type: Object as () => PptDocumentModel, required: true },
    /** useSlides 返回值，供开始 tab 的编辑 / 排列等操作直接调用 */
    state: { type: Object as () => SlidesState, default: undefined },
  },
  data() {
    return {
      activeTab: 'home' as 'home' | 'insert',
      tablePickerVisible: false,
      endCell: [] as number[],
      // 自定义行列（参考 PPTist TableGenerator 的自定义模式）
      isCustom: false,
      customRow: 3,
      customCol: 3,
      // 颜色弹层锚点（null 为收起）
      colorAnchor: null as null | 'fill' | 'fontColor',
      // 弹层用 fixed 定位（相对视口），避免被工具栏的横向滚动容器裁剪
      colorPopupStyle: {} as Record<string, string>,
      tablePopupStyle: {} as Record<string, string>,
      // 背景图片图库弹窗状态（多选）
      bgDialogVisible: false,
      bgImages: [] as string[],
      selectedBgs: [] as string[],
      // 编辑态光标处富文本状态（RICH_TEXT_STATE 回显）
      richtextState: null as RichTextState | null,
      // 供模板渲染的静态配置
      fontFamilies: FONT_FAMILIES,
      fontSizes: FONT_SIZES,
      lineHeights: LINE_HEIGHTS,
      alignOptions: ALIGN_OPTIONS,
      palette: PALETTE,
      orderOptions: ORDER_OPTIONS,
    };
  },
  computed: {
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
        fontSize: (isEditing ? rt && rt.fontSize : el && el.fontSize && String(el.fontSize)) || '',
        foreColor: (isEditing ? rt && rt.foreColor : el && el.color) || '',
        bold: isEditing ? !!(rt && rt.bold) : !!(el && el.bold),
        italic: !!(rt && rt.italic),
        underline: !!(rt && rt.underline),
        strikeThrough: !!(rt && rt.strikeThrough),
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
    emitter.on<RichTextState>(RICH_TEXT_STATE, this.onRichtextState);
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onOutsideClick, true);
    emitter.off<RichTextState>(RICH_TEXT_STATE, this.onRichtextState);
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
    // 模板上 @mousedown.prevent 保持编辑区焦点与选区
    execRichText(command: string, value?: string) {
      emitter.emit(RICH_TEXT_COMMAND, { command, value } as RichTextCommand);
    },
    // 编辑态光标状态回显（编辑器 selection 事件 → 工具栏按钮/下拉）
    onRichtextState(state: RichTextState) {
      this.richtextState = state;
    },
    // 字体：编辑态作用于选中文字（富文本 mark），非编辑态作用于整元素
    onFontNameChange(value: string) {
      if (this.isEditingText) this.execRichText('fontName', value || undefined);
      else this.updateText({ fontFamily: value || undefined });
    },
    // 字号：编辑态选区级字号 mark，非编辑态元素级字号
    onFontSizeChange(value: string) {
      if (this.isEditingText) this.execRichText('fontSize', value || undefined);
      else this.updateText({ fontSize: Number(value) || undefined });
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
      this.tablePickerVisible = false;
      this.endCell = [];
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
    emitInsert(element: PptElementModel) {
      this.$emit('insert', element);
    },
    insertTextElement() {
      const width = Math.round(this.doc.width * 0.5);
      const height = 60;
      this.emitInsert({
        id: genId(),
        type: 'text',
        x: Math.round((this.doc.width - width) / 2),
        y: Math.round((this.doc.height - height) / 2),
        width,
        height,
        text: '请输入文字',
        fontSize: 20,
        color: '#303133',
        // 富文本相关字段带默认值创建：保证 Vue 2 defineProperty 响应式覆盖所有字段
        fontFamily: '',
        bold: false,
        align: 'left',
        lineHeight: 1.4,
        fill: '',
      });
    },
    triggerImagePick() {
      (this.$refs.imageInput as HTMLInputElement).click();
    },
    onImageFileChange(e: Event) {
      this.readImageFile(e, (src, img) => {
        // 参考 PPTist createImageElement：按原图比例缩放至文档尺寸内并居中
        const maxWidth = this.doc.width * 0.6;
        const maxHeight = this.doc.height * 0.6;
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        this.emitInsert({
          id: genId(),
          type: 'image',
          x: Math.round((this.doc.width - width) / 2),
          y: Math.round((this.doc.height - height) / 2),
          width,
          height,
          src,
        });
      });
    },
    // 背景图片图库弹窗（参考 WPS/PowerPoint 背景填充库）：
    // 上传本地文件进列表、可多选；确定后按选择顺序逐张插入为底层图片层（可拖动/缩放）
    openBgDialog() {
      this.selectedBgs = [];
      this.bgDialogVisible = true;
    },
    // 多选切换：点击选中，再次点击取消
    toggleBgSelect(img: string) {
      const i = this.selectedBgs.indexOf(img);
      if (i >= 0) this.selectedBgs.splice(i, 1);
      else this.selectedBgs.push(img);
    },
    // 加载图片原始尺寸
    loadImage(src: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    },
    // 确定：按选择顺序逐张插入为图片元素并置于底层（逆序处理使先选者位于最底）
    async confirmBgDialog() {
      const imgs = this.selectedBgs.slice().reverse();
      this.bgDialogVisible = false;
      this.selectedBgs = [];
      for (const src of imgs) {
        let img: HTMLImageElement;
        try {
          img = await this.loadImage(src);
        } catch (e) {
          continue;
        }
        // 参考 PPTist createImageElement：等比缩放至画布内并居中
        const scale = Math.min(1, this.doc.width / img.width, this.doc.height / img.height);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const id = genId();
        this.emitInsert({
          id,
          type: 'image',
          x: Math.round((this.doc.width - width) / 2),
          y: Math.round((this.doc.height - height) / 2),
          width,
          height,
          src,
        });
        // 置于底层，作为背景图片层（普通图片元素，可拖动/缩放）
        if (this.state) this.state.orderElement(id, 'bottom');
      }
    },
    // 取消 / 关闭：仅收起弹窗，不插入
    cancelBgDialog() {
      this.bgDialogVisible = false;
    },
    triggerBgUpload() {
      (this.$refs.bgUploadInput as HTMLInputElement).click();
    },
    // 上传本地图片（可多张）：追加进图库列表
    onBgUpload(e: Event) {
      const input = e.target as HTMLInputElement;
      const files = Array.from(input.files || []);
      input.value = '';
      if (!files.length) return;
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.bgImages.push(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    },
    // 通用图片文件读取：选择文件 → dataURL → Image 加载完成回调
    readImageFile(e: Event, onLoaded: (src: string, img: HTMLImageElement) => void) {
      const input = e.target as HTMLInputElement;
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const img = new Image();
        img.onload = () => onLoaded(src, img);
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    toggleTablePicker(e: Event) {
      this.tablePickerVisible = !this.tablePickerVisible;
      if (this.tablePickerVisible) {
        this.tablePopupStyle = this.anchorPopupStyle(e, 224);
        this.isCustom = false;
        this.endCell = [];
      } else {
        this.endCell = [];
      }
    },
    insertCustomTable() {
      const row = Math.min(20, Math.max(1, Math.round(this.customRow) || 1));
      const col = Math.min(20, Math.max(1, Math.round(this.customCol) || 1));
      this.insertTableElement(row, col);
      this.isCustom = false;
    },
    insertTableElement(row: number, col: number) {
      const cellWidth = Math.min(100, (this.doc.width * 0.8) / col);
      const cellHeight = 36;
      const width = Math.round(cellWidth * col);
      const height = cellHeight * row;
      const data: PptTableCell[][] = [];
      for (let r = 0; r < row; r++) {
        const rowCells: PptTableCell[] = [];
        for (let c = 0; c < col; c++) {
          rowCells.push({ id: genId(), text: '', colspan: 1, rowspan: 1 });
        }
        data.push(rowCells);
      }
      const table: PptTableElement = {
        id: genId(),
        type: 'table',
        x: Math.round((this.doc.width - width) / 2),
        y: Math.round((this.doc.height - height) / 2),
        width,
        height,
        data,
        colWidths: new Array(col).fill(1 / col),
        outlineColor: '#dcdcdc',
        headerFill: '#ecf5ff',
        headerColor: '#409eff',
        fontSize: 14,
        color: '#606266',
      };
      this.tablePickerVisible = false;
      this.isCustom = false;
      this.endCell = [];
      this.emitInsert(table);
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
      if (this.tablePickerVisible) {
        this.tablePickerVisible = false;
        this.endCell = [];
      }
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
  /* 固定功能行高度：开始/插入两个 tab 内容不同但工具栏总高一致，避免切换时画布抖动 */
  min-height: 71px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.vpk-tool-group {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 2px;
  padding: 0 6px;
}

.vpk-group-label {
  font-size: 10px;
  line-height: 14px;
  color: #909399;
  text-align: center;
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

.vpk-tool-btn svg {
  width: 15px;
  height: 15px;
}

/* 图标按钮（加粗 / 对齐 / 排列 / 复制粘贴等） */
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
  font-size: 13px;
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

.vpk-icon-btn svg {
  width: 15px;
  height: 15px;
}

.bold-btn {
  font-weight: 800;
  font-size: 14px;
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

/* 下拉选择 */
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
  width: 15px;
  height: 15px;
}

.vpk-color-icon svg {
  width: 15px;
  height: 15px;
}

.vpk-color-block {
  position: absolute;
  left: 3px;
  right: 3px;
  bottom: 0;
  height: 4px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}

/* 颜色弹层：预设色板 + 自定义（参考 PPTist ColorPicker）；fixed 定位避免被滚动容器裁剪 */
.vpk-color-popup {
  position: fixed;
  z-index: 40;
  /* 9 列色板（9x18px + 8x4px 间距）+ 内边距，宽度精确容纳不溢出 */
  width: 212px;
  padding: 8px;
  background: #fff;
  border: 1px solid var(--vpk-border, #e4e7ed);
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
}

.vpk-color-swatches {
  display: grid;
  grid-template-columns: repeat(9, 18px);
  gap: 4px;
}

.vpk-swatch {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 2px;
  cursor: pointer;
  box-sizing: border-box;
}

.vpk-swatch:hover {
  transform: scale(1.12);
  border-color: var(--vpk-primary, #409eff);
}

.vpk-color-custom {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--vpk-border, #ebeef5);
}

.vpk-color-custom-label {
  font-size: 12px;
  color: #606266;
}

.vpk-color-custom input[type='color'] {
  width: 26px;
  height: 22px;
  padding: 0;
  border: 1px solid #dcdcdc;
  border-radius: 2px;
  background: #fff;
  cursor: pointer;
  box-sizing: border-box;
}

.vpk-color-none {
  margin-left: auto;
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  background: #fff;
  color: #606266;
  cursor: pointer;
}

.vpk-color-none:hover {
  color: var(--vpk-primary, #409eff);
  border-color: var(--vpk-primary, #409eff);
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

/* 背景图片图库弹窗 */
.vpk-dialog-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
}

.vpk-bg-dialog {
  display: flex;
  flex-direction: column;
  width: 640px;
  max-width: calc(100vw - 48px);
  height: 420px;
  max-height: calc(100vh - 96px);
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.vpk-bg-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #ebeef5;
}

.vpk-dialog-close {
  padding: 2px 4px;
  font-size: 18px;
  line-height: 1;
  color: #909399;
  cursor: pointer;
}

.vpk-dialog-close:hover {
  color: #409eff;
}

/* 图库：上下滑动翻页，已选状态由数据驱动、滚动不丢失 */
.vpk-bg-gallery {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-content: flex-start;
  padding: 14px;
  overflow-y: auto;
  box-sizing: border-box;
}

.vpk-bg-empty {
  width: 100%;
  margin-top: 120px;
  font-size: 13px;
  color: #909399;
  text-align: center;
}

.vpk-bg-thumb {
  position: relative;
  width: 104px;
  height: 72px;
  border: 2px solid #dcdfe6;
  border-radius: 4px;
  background: #f5f7fa;
  cursor: pointer;
  overflow: hidden;
  box-sizing: border-box;
  flex-shrink: 0;
}

.vpk-bg-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vpk-bg-thumb:hover {
  border-color: #409eff;
}

.vpk-bg-thumb.selected {
  border-color: #409eff;
}

.vpk-bg-check {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 12px;
  color: #fff;
  background: #409eff;
  border-radius: 50%;
}

.vpk-bg-dialog-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid #ebeef5;
}

.vpk-bg-selected-tip {
  margin-right: auto;
  font-size: 12px;
  color: #909399;
}

/* 表格选择器：fixed 定位避免被滚动容器裁剪 */
.vpk-table-picker {
  position: fixed;
  z-index: 30;
  background: #fff;
  border: 1px solid var(--vpk-border, #e4e7ed);
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  padding: 8px;
}

.vpk-table-picker-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 20px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #606266;
}

.vpk-table-picker-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.vpk-table-picker-toggle {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  cursor: pointer;
  color: var(--vpk-primary, #409eff);
}

.vpk-table-picker-toggle:hover {
  text-decoration: underline;
}

/* 自定义行列面板（参考 PPTist TableGenerator 自定义模式） */
.vpk-table-custom {
  width: 170px;
}

.vpk-table-custom-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.vpk-table-custom-row label {
  flex: 1;
  font-size: 12px;
  color: #606266;
}

.vpk-table-custom-row input {
  flex: 1.4;
  height: 24px;
  padding: 0 6px;
  font-size: 12px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  box-sizing: border-box;
  color: #606266;
}

.vpk-table-custom-row input:focus {
  outline: none;
  border-color: var(--vpk-primary, #409eff);
}

.vpk-table-custom-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 2px;
}

.vpk-btn {
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  color: #606266;
  cursor: pointer;
}

.vpk-btn:hover {
  color: var(--vpk-primary, #409eff);
  border-color: var(--vpk-primary, #409eff);
}

.vpk-btn.primary {
  background: var(--vpk-primary, #409eff);
  border-color: var(--vpk-primary, #409eff);
  color: #fff;
}

.vpk-btn.primary:hover {
  background: #66b1ff;
  border-color: #66b1ff;
  color: #fff;
}

.vpk-table-picker-close {
  cursor: pointer;
  color: #909399;
  padding: 0 2px;
}

.vpk-table-picker-close:hover {
  color: var(--vpk-primary, #409eff);
}

.vpk-table-picker-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vpk-picker-row {
  display: flex;
  gap: 2px;
}

.vpk-picker-cell {
  width: 18px;
  height: 18px;
  padding: 0;
  background: #f5f7fa;
  border: 1px solid #dcdcdc;
  border-radius: 2px;
  cursor: pointer;
  box-sizing: border-box;
}

.vpk-picker-cell.active {
  background: rgba(64, 158, 255, 0.12);
  border-color: var(--vpk-primary, #409eff);
}
</style>
