/**
 * 标尺刻度与参考线换算（纯函数，vue2 / vue3 双端共享）。
 *
 * 标尺刻度必须基于文档实际尺寸计算（文档默认 960x540）：
 * 从步长阶梯中选取最小可用步长（刻度数 ≤ maxTicks），刻度绝对定位在 值 x 缩放比 处，
 * 保证读数与文档坐标一致。
 */

/** 步长阶梯（文档单位）：刻度数超过 maxTicks 时逐级放大 */
const RULER_STEP_LADDER = [20, 50, 100, 200, 500, 1000, 2000, 5000];

export interface RulerTicks {
  /** 主刻度步长（文档单位） */
  step: number;
  /** 主刻度值（升序，均 ≤ length） */
  values: number[];
}

/**
 * 计算标尺主刻度：选取使刻度数 ≤ maxTicks 的最小步长。
 * 如 length=960 → step=100（100..900 共 9 个）；length=540 → step=50（50..500 共 10 个）。
 */
export function computeRulerTicks(length: number, maxTicks = 12): RulerTicks {
  const step = RULER_STEP_LADDER.find((s) => length / s <= maxTicks) ?? RULER_STEP_LADDER[RULER_STEP_LADDER.length - 1];
  const values: number[] = [];
  for (let v = step; v <= length; v += step) values.push(v);
  return { step, values };
}

/**
 * 参考线拖动换算：起始值 + 屏幕位移（px）按画布缩放比折算为文档坐标，
 * 钳制在 [0, max] 内并取整。
 */
export function clampGuideValue(start: number, delta: number, scale: number, max: number): number {
  const value = start + delta / scale;
  return Math.round(Math.min(max, Math.max(0, value)));
}
