/**
 * 撤销 / 重做历史栈（框架无关，vue2 / vue3 双端共享）。
 *
 * post-state 模型：clear() 写入初始帧（栈底），此后每次变更完成后调用 record()
 * 记录「结果态」；undo() 返回上一帧、redo() 返回下一帧，由调用方负责恢复。
 *
 * 高频合并：携带相同 tag 且距上一次记录小于 mergeWindow 的记录替换栈顶
 * （覆盖拖拽 / 连续输入 / 方向键连按等连续手势，滚动时间窗），其余情况压栈并
 * 截断指针之后的 redo 段（撤销后再编辑，重做失效）。
 *
 * 设计上不用全局 debounce 收口：记录在变更时同步完成，无延迟落栈竞态——
 * 否则「改完立刻撤销」时 pending 的快照会误截断 redo 栈。
 *
 * 快照内容与结构由调用方决定（如 { slides, slideIndex }），本模块只管栈与指针；
 * 记录与恢复两端都需调用方深拷贝，避免栈内帧与响应式文档共享引用被原地改写。
 */

export interface HistoryOptions {
  /** 栈深上限（含初始帧），超出丢弃最旧帧，默认 50 */
  max?: number;
  /** 同 tag 合并时间窗（毫秒），默认 600 */
  mergeWindow?: number;
}

interface HistoryEntry<T> {
  snapshot: T;
  tag?: string;
  time: number;
}

export interface History<T> {
  /** 记录一次变更后的结果态；tag 与栈顶相同且在时间窗内时替换栈顶（合并为一步） */
  record(snapshot: T, tag?: string): void;
  /** 撤销：返回应恢复的上一帧；不可撤销时返回 null */
  undo(): T | null;
  /** 重做：返回应恢复的下一帧；不可重做时返回 null */
  redo(): T | null;
  canUndo(): boolean;
  canRedo(): boolean;
  /** 重置历史并以 initial 作为初始帧（栈底） */
  clear(initial: T): void;
}

export function createHistory<T>(options?: HistoryOptions): History<T> {
  const max = options?.max ?? 50;
  const mergeWindow = options?.mergeWindow ?? 600;

  let stack: HistoryEntry<T>[] = [];
  let cursor = -1;

  function canUndo(): boolean {
    return cursor > 0;
  }

  function canRedo(): boolean {
    return cursor < stack.length - 1;
  }

  function record(snapshot: T, tag?: string): void {
    const now = Date.now();
    const top = stack[cursor];
    if (top) {
      // 内容与栈顶一致（如 blur 提交与最后一次 input 重复）：不产生新步骤；
      // 同 tag 时顺延时间窗，使持续手势的合并不被空内容记录打断
      if (JSON.stringify(top.snapshot) === JSON.stringify(snapshot)) {
        if (tag && top.tag === tag) top.time = now;
        return;
      }
      // 同 tag 连续手势：替换栈顶，合并为一步
      if (tag && top.tag === tag && now - top.time < mergeWindow) {
        stack[cursor] = { snapshot, tag, time: now };
        return;
      }
    }
    // 常规压栈：丢弃指针之后的 redo 段
    stack = stack.slice(0, cursor + 1);
    stack.push({ snapshot, tag, time: now });
    if (stack.length > max) stack.shift();
    cursor = stack.length - 1;
  }

  function undo(): T | null {
    if (!canUndo()) return null;
    cursor -= 1;
    return stack[cursor].snapshot;
  }

  function redo(): T | null {
    if (!canRedo()) return null;
    cursor += 1;
    return stack[cursor].snapshot;
  }

  function clear(initial: T): void {
    stack = [{ snapshot: initial, time: Date.now() }];
    cursor = 0;
  }

  return { record, undo, redo, canUndo, canRedo, clear };
}
