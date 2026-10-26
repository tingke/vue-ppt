/**
 * 工具栏图标：SVG 文件单源维护（icons/ 目录，24x24 viewBox，线性 stroke 风格）。
 * 构建时以 text loader 内联为字符串导出，vue2 / vue3 双端共用（避免两份 SVG 各自维护）；
 * 图标统一按 20px 渲染（按钮 26px），描边色继承 currentColor。
 */
import iconSave from './icons/save.svg';
import iconCopy from './icons/copy.svg';
import iconPaste from './icons/paste.svg';
import iconFill from './icons/fill.svg';
import iconText from './icons/text.svg';
import iconImage from './icons/image.svg';
import iconTable from './icons/table.svg';
import iconSlide from './icons/slide.svg';
import iconAlignLeft from './icons/align-left.svg';
import iconAlignCenter from './icons/align-center.svg';
import iconAlignRight from './icons/align-right.svg';
import iconAlignJustify from './icons/align-justify.svg';
import iconOrderUp from './icons/order-up.svg';
import iconOrderTop from './icons/order-top.svg';
import iconOrderDown from './icons/order-down.svg';
import iconOrderBottom from './icons/order-bottom.svg';
import iconRuler from './icons/ruler.svg';
import iconGuide from './icons/guide.svg';
import iconUndo from './icons/undo.svg';
import iconRedo from './icons/redo.svg';

/** 完整 SVG 字符串（含 currentColor 描边），经 v-html 内联渲染 */
export const TOOLBAR_ICONS = {
  /** 保存 */
  save: iconSave,
  /** 复制 */
  copy: iconCopy,
  /** 粘贴 */
  paste: iconPaste,
  /** 填充色（色块叠层见各端 ColorButton 实现） */
  fill: iconFill,
  /** 文字（A 字，兼作字体颜色 / 插入文本） */
  text: iconText,
  /** 图片（兼作背景图片 / 插入图片） */
  image: iconImage,
  /** 表格 */
  table: iconTable,
  /** 幻灯片（新建幻灯片） */
  slide: iconSlide,
  /** 左对齐 */
  alignLeft: iconAlignLeft,
  /** 居中 */
  alignCenter: iconAlignCenter,
  /** 右对齐 */
  alignRight: iconAlignRight,
  /** 两端对齐 */
  alignJustify: iconAlignJustify,
  /** 上移一层 */
  orderUp: iconOrderUp,
  /** 置于顶层 */
  orderTop: iconOrderTop,
  /** 下移一层 */
  orderDown: iconOrderDown,
  /** 置于底层 */
  orderBottom: iconOrderBottom,
  /** 标尺（画布标尺显隐） */
  ruler: iconRuler,
  /** 参考线（画布参考线显隐） */
  guide: iconGuide,
  /** 撤销 */
  undo: iconUndo,
  /** 重做 */
  redo: iconRedo,
};

export type ToolbarIconName = keyof typeof TOOLBAR_ICONS;

/** 按对齐方式取图标（对齐候选项见 presets 的 ALIGN_OPTIONS） */
export const ALIGN_ICONS: Record<string, string> = {
  left: TOOLBAR_ICONS.alignLeft,
  center: TOOLBAR_ICONS.alignCenter,
  right: TOOLBAR_ICONS.alignRight,
  justify: TOOLBAR_ICONS.alignJustify,
};

/** 按层级命令取图标（命令候选项见 presets 的 ORDER_OPTIONS） */
export const ORDER_ICONS: Record<string, string> = {
  up: TOOLBAR_ICONS.orderUp,
  top: TOOLBAR_ICONS.orderTop,
  down: TOOLBAR_ICONS.orderDown,
  bottom: TOOLBAR_ICONS.orderBottom,
};
