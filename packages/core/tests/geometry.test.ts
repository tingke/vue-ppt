import { describe, expect, it } from 'vitest';
import {
  MIN_SIZE,
  SORPTION_RANGE,
  adsorb,
  collectAlignLines,
  computeResize,
} from '../src/geometry';
import type { PptElementModel } from '../src/index';

function el(id: string, x: number, y: number, width: number, height: number): PptElementModel {
  return { id, type: 'shape', shape: 'rect', x, y, width, height };
}

describe('collectAlignLines', () => {
  it('收集其他元素的边线与中线，排除拖动元素自身', () => {
    const lines = collectAlignLines([el('a', 10, 20, 30, 40), el('b', 0, 0, 100, 50)], 960, 540, 'b');
    // 元素 a：上 20 / 下 60 / 中 40 三条水平线
    expect(lines.h.map((l) => l.value)).toContain(20);
    expect(lines.h.map((l) => l.value)).toContain(60);
    expect(lines.h.map((l) => l.value)).toContain(40);
    // 元素 a：左 10 / 右 40 / 中 25 三条垂直线
    expect(lines.v.map((l) => l.value)).toContain(10);
    expect(lines.v.map((l) => l.value)).toContain(40);
    expect(lines.v.map((l) => l.value)).toContain(25);
  });

  it('始终包含画布边界与中心线', () => {
    const lines = collectAlignLines([], 960, 540, 'x');
    expect(lines.h.map((l) => l.value)).toEqual(expect.arrayContaining([0, 270, 540]));
    expect(lines.v.map((l) => l.value)).toEqual(expect.arrayContaining([0, 480, 960]));
  });

  it('每个其他元素贡献 3 条水平线 + 3 条垂直线', () => {
    const lines = collectAlignLines([el('a', 0, 0, 1, 1), el('b', 5, 5, 1, 1)], 100, 100, 'b');
    // 扣除画布边界/中心的 3 条后，剩余来自元素 a
    expect(lines.h.length).toBe(3 + 3);
    expect(lines.v.length).toBe(3 + 3);
  });
});

describe('adsorb', () => {
  const lines = [{ value: 100, range: [0, 50] as [number, number] }];

  it('命中吸附线时返回校正量与展示线', () => {
    // 目标 min=98 距 100 为 2 < SORPTION_RANGE，应吸附
    const r = adsorb(98, 148, lines, 'v');
    expect(r?.offset).toBe(-2);
    expect(r?.line).toEqual({ type: 'v', value: 100, range: [0, 50] });
  });

  it('max 与 center 同样参与吸附', () => {
    expect(adsorb(0, 102, lines, 'v')?.offset).toBe(2); // max=102 命中
    // min/max 距线均 ≥ 阈值，仅 center（103）命中
    expect(adsorb(95, 111, lines, 'h')?.offset).toBe(3);
  });

  it('无命中返回 null', () => {
    expect(adsorb(0, 10, lines, 'v')).toBeNull();
  });

  it('恰好等于阈值距离时不吸附（严格小于）', () => {
    expect(adsorb(100 - SORPTION_RANGE, 0, lines, 'v')).toBeNull();
  });
});

describe('computeResize', () => {
  const origin = { x: 100, y: 100, width: 100, height: 50 };

  it('RIGHT_BOTTOM：右下角拉伸', () => {
    expect(computeResize('RIGHT_BOTTOM', origin, 20, 10)).toEqual({ x: 100, y: 100, width: 120, height: 60 });
  });

  it('LEFT：左移时保持右边不动', () => {
    expect(computeResize('LEFT', origin, 20, 0)).toEqual({ x: 120, y: 100, width: 80, height: 50 });
  });

  it('TOP：向上拉时保持下边不动', () => {
    expect(computeResize('TOP', origin, 0, -10)).toEqual({ x: 100, y: 90, width: 100, height: 60 });
  });

  it('LEFT_TOP：对角拉伸保持右下角不动', () => {
    expect(computeResize('LEFT_TOP', origin, 30, 20)).toEqual({ x: 130, y: 120, width: 70, height: 30 });
  });

  it('最小尺寸钳制且取整', () => {
    expect(computeResize('RIGHT', origin, -200.6, 0)).toEqual({ x: 100, y: 100, width: MIN_SIZE, height: 50 });
    expect(computeResize('BOTTOM', origin, 0, -0.4)).toEqual({ x: 100, y: 100, width: 100, height: 50 });
  });
});
