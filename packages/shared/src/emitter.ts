/**
 * 编辑器事件单源（vue2 / vue3 双端共享，P1-2 单源）：
 * - 模块级兜底 emitter：仅当组件脱离编辑器树（inject 不到实例级 emitter）时使用；
 *   实例级 emitter 由 PptStage / PptEditor 经 provide(EDITOR_EMITTER) 注入，多实例互不串扰
 * - inject key 统一为字符串：vue2 的 provide/inject 不支持 InjectionKey 泛型，
 *   字符串即可跨端共享同一份源码（前缀 vpk 防碰撞）
 */
import { createEmitter } from '@tthappy/ppt-core';
import type { EditorEmitter } from '@tthappy/ppt-core';

export const sharedEmitter: EditorEmitter = createEmitter();

/** provide/inject key：编辑器实例级事件转发器（工具栏与画布元素组件解耦通信） */
export const EDITOR_EMITTER = 'vpk-editor-emitter';

/** 业务变量树 inject key：编辑器宿主 provide，业务文本组件注入（fx 级联选择数据源） */
export const BIZ_VARIABLES_KEY = 'vpkBizVariables';

/** 媒体组件下拉选项树 inject key：编辑器宿主 provide，媒体组件注入（级联选择数据源） */
export const MEDIA_OPTIONS_KEY = 'vpkMediaOptions';

/** 页面类型候选项 inject key：编辑器宿主 provide（业务经 slide-types 配置下发），
 *  工具栏新建幻灯片下拉 / 缩略图角标与右键切换类型共用 */
export const SLIDE_TYPES_KEY = 'vpkSlideTypes';

/** 插入条目白名单 inject key：编辑器宿主 provide（业务经 insert-items 配置下发，未配置时按
 *  bizVariables / mediaOptions 推导缺省），工具栏注入后按条目 id 门控显隐 */
export const INSERT_ITEMS_KEY = 'vpkInsertItems';
