/**
 * 工具栏预设（vue2 / vue3 双端共享）：
 * 字体、字号、行距、对齐、色板与排列命令候选项。
 */
import type { PptSlideType, PptTextAlign } from './index';

/** 常用系统字体（仅保留系统字体） */
export const FONT_FAMILIES: { label: string; value: string }[] = [
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

/** 文本默认字号 */
export const DEFAULT_FONT_SIZE = 16;
/** 文本默认颜色（正文主色） */
export const DEFAULT_TEXT_COLOR = '#303133';
/** 行距缺省倍数（缺省继承设计下的渲染兜底值） */
export const DEFAULT_LINE_HEIGHT = 1.4;

/** 字号与行距候选项 */
export const FONT_SIZES: number[] = [12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 60, 72];
export const LINE_HEIGHTS: number[] = [1, 1.15, 1.2, 1.4, 1.5, 1.75, 2, 2.5, 3];

export const ALIGN_OPTIONS: { label: string; value: PptTextAlign }[] = [
  { label: '左对齐', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '右对齐', value: 'right' },
  { label: '两端对齐', value: 'justify' },
];

/** 预设色板（主题色 + 常用色） */
export const PALETTE: string[] = [
  '#000000', '#262626', '#595959', '#8c8c8c', '#bfbfbf', '#d9d9d9', '#f0f0f0', '#ffffff', '#7f2b2b',
  '#303133', '#606266', '#909399', '#c0c4cc', '#409eff', '#1677ff', '#2f54eb', '#722ed1', '#eb2f96',
  '#f5222d', '#fa541c', '#fa8c16', '#fadb14', '#a0d911', '#52c41a', '#13c2c2', '#2e8b57', '#8b4513',
];

/** 排列（层级调整）命令 */
export const ORDER_OPTIONS: { label: string; command: 'up' | 'top' | 'down' | 'bottom' }[] = [
  { label: '上移一层', command: 'up' },
  { label: '置于顶层', command: 'top' },
  { label: '下移一层', command: 'down' },
  { label: '置于底层', command: 'bottom' },
];

/** 页面类型候选项（新建幻灯片下拉 / 缩略图右键切换共用，双端一致） */
export const SLIDE_TYPES: { label: string; value: PptSlideType }[] = [
  { label: '自定义页', value: 'custom' },
  { label: '特殊点位页（循环）', value: 'pointSpecial' },
  { label: '点位页（循环）', value: 'point' },
];

/** 页面类型显示名（缺省视为自定义页） */
export function getSlideTypeLabel(type?: PptSlideType): string {
  return SLIDE_TYPES.find((t) => t.value === (type || 'custom'))?.label || SLIDE_TYPES[0].label;
}
