/**
 * ProseMirror 富文本 Schema（参考 PPTist src/utils/prosemirror）。
 *
 * 设计要点：
 * - nodes 仅 doc / paragraph / text / hard_break：对齐、行距等段落级样式
 *   保持为元素级属性，由编辑器容器 CSS 继承，不进入文档模型
 * - marks 统一输出 <span style="...">，parseDOM 覆盖存量 HTML 的常见写法
 *   （b/strong/i/em/u/s/del/span[style]），保证旧数据零迁移
 * - Schema 本身即白名单：DOMParser.fromSchema 解析时丢弃白名单外内容
 */
import { DOMParser as PMDOMParser, DOMSerializer, Schema } from 'prosemirror-model';
import type { Mark, Node as PMNode } from 'prosemirror-model';

export const richSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      parseDOM: [{ tag: 'p' }, { tag: 'div' }],
      toDOM: () => ['p', 0],
    },
    text: { group: 'inline' },
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM: () => ['br'],
    },
  },
  marks: {
    strong: {
      parseDOM: [
        { tag: 'b' },
        { tag: 'strong' },
        { style: 'font-weight', getAttrs: (value: string) => (/^(bold|[5-9]\d{2,})$/i.test(value) ? null : false) },
      ],
      toDOM: () => ['span', { style: 'font-weight: bold' }, 0],
    },
    em: {
      parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style', getAttrs: (value: string) => (value === 'italic' ? null : false) }],
      toDOM: () => ['span', { style: 'font-style: italic' }, 0],
    },
    underline: {
      parseDOM: [
        { tag: 'u' },
        { style: 'text-decoration', getAttrs: (value: string) => (value.includes('underline') ? null : false) },
      ],
      toDOM: () => ['span', { style: 'text-decoration: underline' }, 0],
    },
    strikethrough: {
      parseDOM: [
        { tag: 's' },
        { tag: 'strike' },
        { tag: 'del' },
        { style: 'text-decoration', getAttrs: (value: string) => (value.includes('line-through') ? null : false) },
      ],
      toDOM: () => ['span', { style: 'text-decoration: line-through' }, 0],
    },
    forecolor: {
      attrs: { color: { default: null } },
      parseDOM: [{ style: 'color', getAttrs: (value: string) => ({ color: value }) }],
      toDOM: (mark: Mark) => ['span', { style: `color: ${mark.attrs.color}` }, 0],
    },
    fontname: {
      attrs: { fontname: { default: null } },
      parseDOM: [{ style: 'font-family', getAttrs: (value: string) => ({ fontname: value }) }],
      toDOM: (mark: Mark) => ['span', { style: `font-family: ${mark.attrs.fontname}` }, 0],
    },
    fontsize: {
      // 无单位数字字符串，toDOM 时补 px；parseDOM 时去掉单位，便于工具栏回显匹配
      attrs: { fontsize: { default: null } },
      parseDOM: [{ style: 'font-size', getAttrs: (value: string) => ({ fontsize: String(parseFloat(value)) }) }],
      toDOM: (mark: Mark) => ['span', { style: `font-size: ${mark.attrs.fontsize}px` }, 0],
    },
  },
});

/** HTML → ProseMirror 文档（Schema 即白名单，白名单外内容被丢弃） */
export function parseContent(html: string): PMNode {
  const el = document.createElement('div');
  el.innerHTML = html || '';
  return PMDOMParser.fromSchema(richSchema).parse(el);
}

/** ProseMirror 文档 → HTML */
export function serializeDoc(doc: PMNode): string {
  const el = document.createElement('div');
  el.appendChild(DOMSerializer.fromSchema(richSchema).serializeFragment(doc.content));
  return el.innerHTML;
}
