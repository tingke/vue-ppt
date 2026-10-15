export interface PptDocumentModel {
  width: number;
  height: number;
  slides: PptSlideModel[];
  warnings: string[];
}

export interface PptSlideModel {
  id: string;
  elements: PptElementModel[];
}

export type PptElementModel = PptTextElement | PptImageElement | PptShapeElement | PptTableElement;

export interface PptBaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
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

export * from './richeditor';

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
