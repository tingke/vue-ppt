/**
 * 画布几何算法（vue2 / vue3 双端共享）：拖拽对齐吸附 + 手柄缩放计算。
 * 纯函数、无副作用，供 SlideCanvas 的 mousemove 高频路径调用。
 */
import type { PptElementModel } from './index';

export type ResizeDirection =
  | 'LEFT_TOP' | 'TOP' | 'RIGHT_TOP'
  | 'LEFT' | 'RIGHT'
  | 'LEFT_BOTTOM' | 'BOTTOM' | 'RIGHT_BOTTOM';

export interface AlignLine {
  value: number;
  range: [number, number];
}

/** 展示用的吸附线：h 为水平线（吸附 y 坐标），v 为垂直线（吸附 x 坐标） */
export interface AlignLineView {
  type: 'h' | 'v';
  value: number;
  range: [number, number];
}

export type AlignLineSet = { h: AlignLine[]; v: AlignLine[] };

/** 缩放最小尺寸钳制 */
export const MIN_SIZE = 20;
/** 吸附判定阈值（文档单位） */
export const SORPTION_RANGE = 5;
/** 拖拽误操作判定阈值（屏幕像素）：首帧位移小于该值视为点击而非拖动 */
export const MISOP_RANGE = 5;

/**
 * 收集吸附线：其他元素的上 / 下 / 中边、左 / 右 / 中线，加画布边界与中心。
 * 调用方应在拖拽 / 缩放开始时收集一次并缓存到上下文——拖动过程中其他元素不动，
 * 缓存始终有效；避免在 mousemove 里高频全量遍历。
 */
export function collectAlignLines(
  elements: readonly PptElementModel[],
  canvasWidth: number,
  canvasHeight: number,
  excludeId: string
): AlignLineSet {
  const h: AlignLine[] = [];
  const v: AlignLine[] = [];

  for (const el of elements) {
    if (el.id === excludeId) continue;
    const l = el.x;
    const t = el.y;
    const r = el.x + el.width;
    const b = el.y + el.height;
    h.push({ value: t, range: [l, r] }, { value: b, range: [l, r] }, { value: t + el.height / 2, range: [l, r] });
    v.push({ value: l, range: [t, b] }, { value: r, range: [t, b] }, { value: l + el.width / 2, range: [t, b] });
  }

  // 画布边界与中心
  const W = canvasWidth;
  const H = canvasHeight;
  h.push({ value: 0, range: [0, W] }, { value: H, range: [0, W] }, { value: H / 2, range: [0, W] });
  v.push({ value: 0, range: [0, H] }, { value: W, range: [0, H] }, { value: W / 2, range: [0, H] });

  return { h, v };
}

/** 目标范围（min / max / center）与吸附线比较，返回校正量与展示线（无吸附返回 null） */
export function adsorb(
  targetMin: number,
  targetMax: number,
  lines: readonly AlignLine[],
  type: 'h' | 'v'
): { offset: number; line: AlignLineView } | null {
  const center = (targetMin + targetMax) / 2;
  for (const l of lines) {
    if (Math.abs(targetMin - l.value) < SORPTION_RANGE)
      return { offset: targetMin - l.value, line: { type, value: l.value, range: l.range } };
    if (Math.abs(targetMax - l.value) < SORPTION_RANGE)
      return { offset: targetMax - l.value, line: { type, value: l.value, range: l.range } };
    if (Math.abs(center - l.value) < SORPTION_RANGE)
      return { offset: center - l.value, line: { type, value: l.value, range: l.range } };
  }
  return null;
}

/**
 * 按方向计算新位置尺寸：移动边 / 角时保持对边（对角）不动，最小尺寸钳制。
 * mx / my 为文档坐标系的位移增量。
 */
export function computeResize(
  d: ResizeDirection,
  o: { x: number; y: number; width: number; height: number },
  mx: number,
  my: number
): { x: number; y: number; width: number; height: number } {
  let width = o.width;
  let height = o.height;

  if (d === 'RIGHT_BOTTOM') { width = o.width + mx; height = o.height + my; }
  else if (d === 'LEFT_BOTTOM') { width = o.width - mx; height = o.height + my; }
  else if (d === 'LEFT_TOP') { width = o.width - mx; height = o.height - my; }
  else if (d === 'RIGHT_TOP') { width = o.width + mx; height = o.height - my; }
  else if (d === 'LEFT') width = o.width - mx;
  else if (d === 'RIGHT') width = o.width + mx;
  else if (d === 'TOP') height = o.height - my;
  else if (d === 'BOTTOM') height = o.height + my;

  width = Math.max(MIN_SIZE, Math.round(width));
  height = Math.max(MIN_SIZE, Math.round(height));

  let x = o.x;
  let y = o.y;
  if (d === 'LEFT' || d === 'LEFT_TOP' || d === 'LEFT_BOTTOM') x = o.x - (width - o.width);
  if (d === 'TOP' || d === 'LEFT_TOP' || d === 'RIGHT_TOP') y = o.y - (height - o.height);

  return { x, y, width, height };
}
