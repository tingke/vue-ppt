/**
 * 表格渲染工具（vue2 / vue3 双端共享）。
 */
import type { PptTableCell } from './index';

/**
 * 计算被合并单元格覆盖的坐标集合（键格式 "r:c"）。
 * colspan / rowspan 从 1 起生效：colspan=2 覆盖右侧 1 格，rowspan=2 覆盖下方 1 格；
 * 缺省、1、0、负数均视为未合并（防御脏数据）。
 *
 * 渲染层必须跳过集合内的坐标，否则 table-layout: fixed 下每行实际列数会超出
 * colgroup 定义导致布局错乱。数据越界产生的键（如末列 colspan 越界）无害：
 * 渲染层按坐标查找，越界坐标本就没有对应单元格。
 */
export function computeCoveredCells(data: readonly (readonly PptTableCell[])[]): Set<string> {
  const covered = new Set<string>();
  data.forEach((row, r) => {
    row.forEach((cell, c) => {
      const cs = Math.max(1, Math.floor(cell.colspan || 1));
      const rs = Math.max(1, Math.floor(cell.rowspan || 1));
      if (cs === 1 && rs === 1) return;
      for (let dr = 0; dr < rs; dr++) {
        for (let dc = 0; dc < cs; dc++) {
          if (dr === 0 && dc === 0) continue;
          covered.add(`${r + dr}:${c + dc}`);
        }
      }
    });
  });
  return covered;
}
