/**
 * 轻量事件转发器（参考 PPTist emitter）：
 * 工具栏与画布元素组件解耦通信，如富文本命令 RICH_TEXT_COMMAND。
 * 命令/状态类型与 core 的 TextEditor 保持一致。
 */
import type { RichTextAction, RichTextState } from '@vue-ppt-kit/core';

/** 富文本命令：target 为目标元素 id，编辑器侧仅响应自身元素 */
export type RichTextCommand = RichTextAction & { target?: string };
export type { RichTextState };

type Handler<T> = (payload: T) => void;

const handlers = new Map<string, Set<Handler<unknown>>>();

export const RICH_TEXT_COMMAND = 'rich-text-command';
export const RICH_TEXT_STATE = 'rich-text-state';

export const emitter = {
  on<T>(event: string, handler: Handler<T>) {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
  },
  off<T>(event: string, handler: Handler<T>) {
    handlers.get(event)?.delete(handler as Handler<unknown>);
  },
  emit<T>(event: string, payload: T) {
    handlers.get(event)?.forEach((fn) => fn(payload));
  },
};
