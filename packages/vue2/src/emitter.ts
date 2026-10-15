/**
 * 模块级兜底 emitter：仅当组件脱离 PptStage 树（inject 不到实例级 emitter）时使用。
 * 实例级 emitter 由 PptStage 经 provide(EDITOR_EMITTER) 注入，多编辑器实例互不串扰。
 */
import { createEmitter, EditorEmitter } from '@vue-ppt-kit/core';

export const sharedEmitter: EditorEmitter = createEmitter();
