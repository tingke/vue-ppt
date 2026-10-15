/**
 * 编辑器事件转发器（参考 PPTist emitter）：
 * 工具栏与画布元素组件解耦通信，如富文本命令 RICH_TEXT_COMMAND。
 *
 * 通过 createEmitter() 创建编辑器实例级 emitter，由 PptEditor / PptStage
 * 以 provide(EDITOR_EMITTER) 注入组件树；页面上多个编辑器实例时事件互不串扰。
 * 命令/状态类型与 TextEditor 保持一致。
 */
import type { RichTextAction } from './richeditor';

/** 富文本命令：target 为目标元素 id，编辑器侧仅响应自身元素 */
export type RichTextCommand = RichTextAction & { target?: string };

export const RICH_TEXT_COMMAND = 'rich-text-command';
export const RICH_TEXT_STATE = 'rich-text-state';

/** provide/inject key：编辑器实例级事件转发器（vue2 / vue3 组件树内共享） */
export const EDITOR_EMITTER = 'vpk-editor-emitter';

type Handler<T> = (payload: T) => void;

export interface EditorEmitter {
  on<T>(event: string, handler: Handler<T>): void;
  off<T>(event: string, handler: Handler<T>): void;
  emit<T>(event: string, payload: T): void;
}

/** 创建事件转发器实例：on/off/emit，与旧模块级单例语义一致 */
export function createEmitter(): EditorEmitter {
  const handlers = new Map<string, Set<Handler<unknown>>>();
  return {
    on(event, handler) {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler as Handler<unknown>);
    },
    off(event, handler) {
      handlers.get(event)?.delete(handler as Handler<unknown>);
    },
    emit(event, payload) {
      handlers.get(event)?.forEach((fn) => fn(payload));
    },
  };
}
