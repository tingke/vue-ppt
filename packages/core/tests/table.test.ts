import { describe, it, expect } from 'vitest';
import { computeCoveredCells } from '../src';
import type { PptTableCell } from '../src';

const cell = (id: string, extra: Partial<PptTableCell> = {}): PptTableCell => ({ id, text: '', ...extra });

describe('computeCoveredCells', () => {
  it('空数据返回空集合', () => {
    expect(computeCoveredCells([])).toEqual(new Set());
  });

  it('无合并单元格返回空集合', () => {
    const data = [
      [cell('a'), cell('b')],
      [cell('c'), cell('d')],
    ];
    expect(computeCoveredCells(data)).toEqual(new Set());
  });

  it('colspan=2 覆盖右侧一格', () => {
    const data = [[cell('a', { colspan: 2 }), cell('b')]];
    expect(computeCoveredCells(data)).toEqual(new Set(['0:1']));
  });

  it('rowspan=2 覆盖下方一格', () => {
    const data = [
      [cell('a', { rowspan: 2 }), cell('b')],
      [cell('c'), cell('d')],
    ];
    expect(computeCoveredCells(data)).toEqual(new Set(['1:0']));
  });

  it('colspan+rowspan 覆盖三格', () => {
    const data = [
      [cell('a', { colspan: 2, rowspan: 2 }), cell('b'), cell('e')],
      [cell('c'), cell('d'), cell('f')],
    ];
    expect(computeCoveredCells(data)).toEqual(new Set(['0:1', '1:0', '1:1']));
  });

  it('colspan/rowspan 为 0 或负数按未合并处理', () => {
    const data = [
      [cell('a', { colspan: 0 }), cell('b', { rowspan: -1 })],
    ];
    expect(computeCoveredCells(data)).toEqual(new Set());
  });

  it('非整数合并值向下取整', () => {
    const data = [[cell('a', { colspan: 2.9 }), cell('b'), cell('c')]];
    expect(computeCoveredCells(data)).toEqual(new Set(['0:1']));
  });

  it('越界坐标产生无害键（渲染层按坐标查找，越界坐标本无单元格）', () => {
    const data = [[cell('a', { colspan: 3 })]];
    expect(computeCoveredCells(data)).toEqual(new Set(['0:1', '0:2']));
  });
});
