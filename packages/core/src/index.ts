/**
 * @tthappy/ppt-core：框架无关的核心包（vue2 / vue3 双端共享）。
 *
 * 内容：
 * - 文档模型：PptDocumentModel / PptSlideModel / PptElementModel 及各元素类型定义
 * - 富文本：ProseMirror 编辑内核（richeditor/）、白名单过滤与业务字段 tag 工具
 * - 画布算法：拖拽吸附 / 手柄缩放几何计算（geometry）、标尺刻度换算（ruler）
 * - 编辑器基建：元素工厂（factory）、事件转发器（emitter）、快捷键（hotkeys）、
 *   工具栏预设（presets）、图标（icons）
 *
 * 本包不依赖 Vue 或任何 UI 框架，可在任意环境（含 Node 测试环境）使用。
 */

export interface PptDocumentModel {
  width: number;
  height: number;
  slides: PptSlideModel[];
  warnings: string[];
}

/** 页面类型：自定义页 / 特殊点位页（循环）/ 点位页（循环） */
export type PptSlideType = 'custom' | 'pointSpecial' | 'point';

export interface PptSlideModel {
  id: string;
  elements: PptElementModel[];
  /** 页面类型，缺省视为 custom（自定义页） */
  slideType?: PptSlideType;
}

export type PptElementModel =
  | PptTextElement
  | PptBizTextElement
  | PptImageElement
  | PptShapeElement
  | PptTableElement
  | PptBizTableElement
  | PptMediaElement;

export interface PptBaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  /** 是否隐藏（不渲染、不可交互，如媒体关联的业务文本经右键隐藏/显示） */
  hidden?: boolean;
}

export type PptTextAlign = 'left' | 'center' | 'right' | 'justify';

export interface PptTextElement extends PptBaseElement {
  type: 'text';
  text: string;
  fontSize?: number;
  color?: string;
  /** 字体族，如 "Microsoft YaHei"，缺省继承页面字体 */
  fontFamily?: string;
  /** 是否加粗 */
  bold?: boolean;
  /** 水平对齐方式，缺省 left */
  align?: PptTextAlign;
  /** 行距（倍数），缺省 1.4 */
  lineHeight?: number;
  /** 文本框填充色，空字符串表示无填充 */
  fill?: string;
}

/**
 * 业务变量树节点（业务文本组件的 fx 级联选择数据源，编辑器级配置，不进文档数据）：
 * 有 children 为分组（可继续展开），叶子节点可选。
 */
export interface PptBizVariableNode {
  /** 显示名（tag 标签文字 / 级联菜单条目文字） */
  label: string;
  /** 说明文字（如图 1 的「新打开网页的对象」） */
  description?: string;
  /** 子节点，缺省为叶子 */
  children?: PptBizVariableNode[];
}

/**
 * 业务文本元素：普通文本与业务字段 tag 混排。
 * text 与 PptTextElement.text 同构（受限内联 HTML），业务字段以
 * <span data-biz-tag="路径">标签</span> 嵌入（ProseMirror biz_tag 原子节点，
 * 不可编辑，退格整体删除）。
 */
export interface PptBizTextElement extends Omit<PptTextElement, 'type'> {
  type: 'bizText';
}

/**
 * 媒体组件：图片 + 级联选照片的纵向组合（业务定制）。
 * 上部 3:4 图片（src 缺省显示占位图，由业务侧填充），点击图片弹出级联选择照片
 * （optionPath 记录选中路径）；关联的业务文本为独立 bizText 元素（textId），
 * 可随意拖动 / 独立删除 / 经媒体右键隐藏。
 */
export interface PptMediaElement extends PptBaseElement {
  type: 'media';
  /** 海报图地址，缺省显示 3:4 占位图 */
  src?: string;
  /** 级联选中的照片路径（「/」分隔，如 特殊照/系统社区/拍照第1张），缺省未选 */
  optionPath?: string;
  /** 关联业务文本元素（独立 bizText，随媒体插入一并创建），缺省无 */
  textId?: string;
}

export interface PptImageElement extends PptBaseElement {
  type: 'image';
  src: string;
  alt?: string;
}

export interface PptShapeElement extends PptBaseElement {
  type: 'shape';
  shape: 'rect' | 'ellipse' | 'line';
  fill?: string;
  stroke?: string;
}

export interface PptTableCell {
  id: string;
  text: string;
  colspan?: number;
  rowspan?: number;
}

export interface PptTableElement extends PptBaseElement {
  type: 'table';
  /** 行列数据，data[row][col] */
  data: PptTableCell[][];
  /** 每列宽度占比（总和为 1），缺省时均分 */
  colWidths?: number[];
  outlineColor?: string;
  headerFill?: string;
  headerColor?: string;
  fontSize?: number;
  color?: string;
}

/**
 * 富表格（业务组件）：结构与表格一致，单元格为业务文本（BizTextElement），
 * 支持普通文本与业务字段 tag 混排（text 同 bizText 的受限内联 HTML）。
 */
export interface PptBizTableElement extends Omit<PptTableElement, 'type'> {
  type: 'bizTable';
}

/**
 * 移除富文本内联 HTML 中指定类型的样式声明（如 color / font-weight）。
 * 用于整元素级样式覆盖：文字一旦被富文本染色/加粗，内联优先级会压过
 * 元素级属性，工具栏整元素设置将失效；故整元素操作前先清除同类内联。
 */
export function stripRichTextStyle(html: string, styleProps: string[]): string {
  if (!html || !/[<&]/.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as Element;
      walk(el);
      if (el.tagName !== 'SPAN') return;
      const style = el.getAttribute('style');
      if (!style) return;
      const kept = style
        .split(';')
        .map((decl) => decl.trim())
        .filter(Boolean)
        .filter((decl) => !styleProps.some((p) => decl.toLowerCase().startsWith(`${p.toLowerCase()}:`)));
      if (kept.length) el.setAttribute('style', kept.join('; '));
      else el.removeAttribute('style');
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

/** Placeholder API. A real implementation must unzip and parse OOXML relationships. */
export async function parsePptx(_source: ArrayBuffer | Blob | string): Promise<PptDocumentModel> {
  throw new Error('parsePptx is not implemented yet. Add ZIP/OOXML parsing before using real PPTX files.');
}

/** 富文本允许的标签白名单（仅内联格式标签） */
const RICH_ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'SPAN', 'DIV', 'P']);

/** 富文本 span 上允许保留的样式声明 */
const RICH_ALLOWED_STYLE = /(color|font-size|font-family|font-weight|font-style|text-decoration)\s*:[^;"]*/gi;

/**
 * 富文本白名单过滤。
 * PptTextElement.text 允许携带受限的内联 HTML（b/i/u/s/span[style]/br 等），
 * 纯文本字符串天然兼容；本函数移除白名单外的标签（保留其子节点）、
 * 非白名单属性，并将 span 的 style 过滤为允许的样式声明。
 */
export function sanitizeRichText(html: string): string {
  if (!html || !/[<&]/.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const unwrap = (el: Element) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  };
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.parentNode?.removeChild(child);
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as Element;
      walk(el);
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') {
        el.parentNode?.removeChild(el);
        return;
      }
      if (!RICH_ALLOWED_TAGS.has(el.tagName)) {
        unwrap(el);
        return;
      }
      Array.from(el.attributes).forEach((attr) => {
        // 业务字段 tag 标记：整体保留（标签文字为子文本节点，天然保留）
        if (attr.name === 'data-biz-tag' && el.tagName === 'SPAN') return;
        // 业务字段 tag 的芯片样式钩子：class 仅保留 vpk-biz-tag（静态渲染与编辑态外观一致）
        if (attr.name === 'class' && el.tagName === 'SPAN' && el.hasAttribute('data-biz-tag')) {
          const kept = attr.value.split(/\s+/).filter((c) => c === 'vpk-biz-tag').join(' ');
          if (kept) el.setAttribute('class', kept);
          else el.removeAttribute('class');
          return;
        }
        if (attr.name === 'style' && el.tagName === 'SPAN') {
          const kept = (attr.value.match(RICH_ALLOWED_STYLE) || []).join('; ');
          if (kept) el.setAttribute('style', kept);
          else el.removeAttribute('style');
        } else {
          el.removeAttribute(attr.name);
        }
      });
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

export function createEmptyDocument(): PptDocumentModel {
  return { width: 960, height: 540, slides: [], warnings: [] };
}

// ==================== 双端共享模块 ====================

export * from './emitter';
export * from './presets';
export * from './factory';
export * from './geometry';
export * from './history';
export * from './hotkeys';
export * from './ruler';
export * from './table';
export * from './richeditor';
export * from './icons';
