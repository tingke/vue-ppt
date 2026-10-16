import { describe, it, expect } from 'vitest';
import { computeRulerTicks, clampGuideValue } from '../src/ruler';

describe('computeRulerTicks', () => {
  it('默认文档宽度 960：步长 100，刻度 100..900', () => {
    const { step, values } = computeRulerTicks(960);
    expect(step).toBe(100);
    expect(values).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900]);
  });

  it('默认文档高度 540：步长 50，刻度 50..500', () => {
    const { step, values } = computeRulerTicks(540);
    expect(step).toBe(50);
    expect(values).toEqual([50, 100, 150, 200, 250, 300, 350, 400, 450, 500]);
  });

  it('PPTist 尺寸 1000：步长 100，含右缘 1000', () => {
    const { step, values } = computeRulerTicks(1000);
    expect(step).toBe(100);
    expect(values[values.length - 1]).toBe(1000);
  });

  it('小尺寸文档选用更小步长，刻度数不超过 maxTicks', () => {
    const { step, values } = computeRulerTicks(200);
    expect(step).toBe(20);
    expect(values.length).toBeLessThanOrEqual(12);
  });

  it('超大尺寸文档逐级放大步长', () => {
    const { step, values } = computeRulerTicks(20000);
    expect(step).toBeGreaterThan(100);
    expect(values.length).toBeLessThanOrEqual(12);
  });

  it('零长度无刻度', () => {
    expect(computeRulerTicks(0).values).toEqual([]);
  });

  it('刻度值均不超过长度', () => {
    for (const length of [960, 540, 1234, 7777]) {
      const { values } = computeRulerTicks(length);
      values.forEach((v) => expect(v).toBeLessThanOrEqual(length));
    }
  });
});

describe('clampGuideValue', () => {
  it('屏幕位移按缩放比折算为文档坐标并取整', () => {
    // 69% 缩放下 +80px 屏幕位移 → +115.9 文档单位
    expect(clampGuideValue(592, 80, 0.69, 960)).toBe(708);
  });

  it('钳制在 [0, max] 范围内', () => {
    expect(clampGuideValue(10, -100, 1, 960)).toBe(0);
    expect(clampGuideValue(950, 100, 1, 960)).toBe(960);
  });

  it('缩放极值（30% / 200%）下换算正确', () => {
    expect(clampGuideValue(100, 30, 0.3, 960)).toBe(200);
    expect(clampGuideValue(100, 100, 2, 960)).toBe(150);
  });
});
