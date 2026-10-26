import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHistory } from '../src/history';

describe('createHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始帧：不可撤销也不可重做', () => {
    const h = createHistory<number>();
    h.clear(0);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBeNull();
  });

  it('record / undo / redo 基本流转', () => {
    const h = createHistory<number>();
    h.clear(0);
    h.record(1);
    h.record(2);
    expect(h.canUndo()).toBe(true);
    expect(h.undo()).toBe(1);
    expect(h.undo()).toBe(0);
    expect(h.undo()).toBeNull();
    expect(h.canRedo()).toBe(true);
    expect(h.redo()).toBe(1);
    expect(h.redo()).toBe(2);
    expect(h.redo()).toBeNull();
  });

  it('撤销后新记录截断 redo 段', () => {
    const h = createHistory<number>();
    h.clear(0);
    h.record(1);
    h.record(2);
    h.undo(); // 回到 1
    h.record(3); // 2 被丢弃
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBe(1);
    expect(h.undo()).toBe(0);
  });

  it('超过栈深上限时丢弃最旧帧', () => {
    const h = createHistory<number>({ max: 3 });
    h.clear(0);
    h.record(1);
    h.record(2);
    h.record(3); // 0 被丢弃，栈为 [1,2,3]
    expect(h.undo()).toBe(2);
    expect(h.undo()).toBe(1);
    expect(h.undo()).toBeNull(); // 0 已不在栈内
  });

  it('同 tag 且在时间窗内：替换栈顶合并为一步', () => {
    const h = createHistory<number>();
    h.clear(0);
    h.record(1, 'drag');
    vi.advanceTimersByTime(100);
    h.record(2, 'drag');
    expect(h.undo()).toBe(0); // 中间态 1 被合并
    expect(h.redo()).toBe(2);
  });

  it('同 tag 但超过时间窗：压栈为新步骤', () => {
    const h = createHistory<number>();
    h.clear(0);
    h.record(1, 'drag');
    vi.advanceTimersByTime(700);
    h.record(2, 'drag');
    expect(h.undo()).toBe(1);
    expect(h.undo()).toBe(0);
  });

  it('不同 tag 与无 tag：均压栈为新步骤', () => {
    const h = createHistory<number>();
    h.clear(0);
    h.record(1, 'drag');
    h.record(2, 'type');
    h.record(3);
    expect(h.undo()).toBe(2);
    expect(h.undo()).toBe(1);
    expect(h.undo()).toBe(0);
  });

  it('内容与栈顶一致：去重不产生新步骤', () => {
    const h = createHistory<number>();
    h.clear(0);
    h.record(1, 'type');
    vi.advanceTimersByTime(700); // 超窗：若不去重会压入重复帧
    h.record(1, 'type');
    expect(h.undo()).toBe(0);
    expect(h.redo()).toBe(1);
  });

  it('内容重复但 tag 不同：顺延栈顶时间窗保持原 tag', () => {
    const h = createHistory<number>();
    h.clear(0);
    h.record(1, 'type');
    vi.advanceTimersByTime(500);
    h.record(1, 'drag'); // 去重跳过，栈顶 tag 仍为 type
    vi.advanceTimersByTime(200); // 距 type 记录 700ms，超窗
    h.record(2, 'type');
    expect(h.undo()).toBe(1);
    expect(h.undo()).toBe(0);
  });

  it('clear 重置历史', () => {
    const h = createHistory<number>();
    h.clear(0);
    h.record(1);
    h.clear(9);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    h.record(10);
    expect(h.undo()).toBe(9);
  });
});
