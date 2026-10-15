// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseContent, serializeDoc } from '../src/richeditor/schema';
import { sanitizeRichText, stripRichTextStyle } from '../src/index';

describe('schema parse/serialize', () => {
  it('纯文本自动包裹段落', () => {
    const doc = parseContent('hello');
    expect(doc.textContent).toBe('hello');
    expect(serializeDoc(doc)).toContain('<p>hello</p>');
  });

  it('空内容产出空文档', () => {
    const doc = parseContent('');
    expect(doc.textContent).toBe('');
    expect(serializeDoc(doc)).toBe('<p></p>');
  });

  it('span style 加粗往返', () => {
    const doc = parseContent('<p><span style="font-weight: bold">ab</span></p>');
    expect(doc.textContent).toBe('ab');
    const html = serializeDoc(doc);
    expect(html).toContain('font-weight: bold');
  });

  it('存量 b/i/u/s 标签兼容（旧数据零迁移）', () => {
    const doc = parseContent('<p><b>b</b><i>i</i><u>u</u><s>s</s></p>');
    const html = serializeDoc(doc);
    expect(html).toContain('font-weight: bold');
    expect(html).toContain('font-style: italic');
    expect(html).toContain('text-decoration: underline');
    expect(html).toContain('text-decoration: line-through');
  });

  it('forecolor / fontname 往返', () => {
    const doc = parseContent('<p><span style="color: red; font-family: Arial">ab</span></p>');
    const html = serializeDoc(doc);
    expect(html).toContain('color: red');
    expect(html).toContain('font-family: Arial');
  });

  it('fontsize：px 往返；非法声明（无单位/em/%）被丢弃', () => {
    expect(serializeDoc(parseContent('<p><span style="font-size: 16px">a</span></p>'))).toContain('font-size: 16px');
    // 无单位长度在 CSS 中即非法，浏览器解析阶段就丢弃，parseDOM 读不到该声明
    expect(serializeDoc(parseContent('<p><span style="font-size: 18">a</span></p>'))).not.toContain('font-size');
    expect(serializeDoc(parseContent('<p><span style="font-size: 1.5em">a</span></p>'))).not.toContain('font-size');
    expect(serializeDoc(parseContent('<p><span style="font-size: 120%">a</span></p>'))).not.toContain('font-size');
  });

  it('fontsize：非 px 单位（em/rem/%）被丢弃，不产出虚假往返', () => {
    const html = serializeDoc(parseContent('<p><span style="font-size: 1.5em">a</span></p>'));
    expect(html).not.toContain('font-size');
    expect(serializeDoc(parseContent('<p><span style="font-size: 120%">a</span></p>'))).not.toContain('font-size');
  });

  it('Schema 即白名单：script 内容被丢弃；白名单外块元素解包保留文字（同 sanitize 语义）', () => {
    const doc = parseContent('<p>ok</p><script>alert(1)</script><ul><li>x</li></ul>');
    expect(doc.textContent).toBe('okx');
    const html = serializeDoc(doc);
    expect(html).not.toContain('alert');
    expect(html).not.toContain('<li');
    expect(html).toContain('x');
  });

  it('br 转 hard_break 往返', () => {
    const html = serializeDoc(parseContent('<p>a<br>b</p>'));
    expect(html).toContain('<br');
  });
});

describe('stripRichTextStyle', () => {
  it('纯文本与空串原样返回', () => {
    expect(stripRichTextStyle('plain', ['color'])).toBe('plain');
    expect(stripRichTextStyle('', ['color'])).toBe('');
  });

  it('仅移除指定声明，保留其余', () => {
    const out = stripRichTextStyle('<span style="color: red; font-weight: bold">ab</span>', ['color']);
    expect(out).toContain('font-weight: bold');
    expect(out).not.toContain('color');
  });

  it('声明全部移除后去掉 style 属性', () => {
    expect(stripRichTextStyle('<span style="color: red">ab</span>', ['color'])).toBe('<span>ab</span>');
  });

  it('属性名匹配不区分大小写', () => {
    const out = stripRichTextStyle('<span style="COLOR: red; font-weight: bold">ab</span>', ['color']);
    expect(out).not.toContain('red');
    expect(out).toContain('font-weight: bold');
  });
});

describe('sanitizeRichText', () => {
  it('纯文本与空串原样返回', () => {
    expect(sanitizeRichText('plain')).toBe('plain');
    expect(sanitizeRichText('')).toBe('');
  });

  it('移除 script/style 元素与注释', () => {
    const out = sanitizeRichText('<p>a</p><script>alert(1)</script><style>.x{}</style><!--c-->');
    expect(out).not.toContain('alert');
    expect(out).not.toContain('.x');
    expect(out).not.toContain('<!--');
  });

  it('移除非白名单属性（如 onclick），白名单外标签解包保留文字', () => {
    const out = sanitizeRichText('<p onclick="x()">a<img src=x onerror=y>b</p>');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onerror');
    expect(out).toContain('a');
    expect(out).toContain('b');
  });

  it('span style 仅保留允许的声明', () => {
    const out = sanitizeRichText('<span style="color: red; position: fixed; font-size: 16px">b</span>');
    expect(out).toContain('color: red');
    expect(out).toContain('font-size: 16px');
    expect(out).not.toContain('position');
  });
});
