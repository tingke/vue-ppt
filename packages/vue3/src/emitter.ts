/**
 * 模块级兜底 emitter：仅当组件脱离 PptEditor 树（inject 不到实例级 emitter）时使用。
 * 实例级 emitter 由 PptEditor 经 provide(EDITOR_EMITTER) 注入，多编辑器实例互不串扰。
 */
import { createEmitter, type EditorEmitter, type PptBizVariableNode } from '@vue-ppt-kit/core';
import type { InjectionKey } from 'vue';

export const sharedEmitter: EditorEmitter = createEmitter();

/** 业务变量树 inject key：PptEditor provide，业务文本组件注入（fx 级联选择数据源） */
export const BIZ_VARIABLES_KEY: InjectionKey<PptBizVariableNode[]> = Symbol('vpkBizVariables');

/** 媒体组件下拉选项树 inject key：PptEditor provide，媒体组件注入（级联选择数据源） */
export const MEDIA_OPTIONS_KEY: InjectionKey<PptBizVariableNode[]> = Symbol('vpkMediaOptions');
