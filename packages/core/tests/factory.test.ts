import { describe, expect, it } from 'vitest';
import {
  createBizTableElement,
  createBizTextElement,
  createImageElement,
  createMediaElement,
  createMediaTextElement,
  createTableElement,
  createTextElement,
  genId,
} from '../src/factory';

const doc = { width: 960, height: 540 };

describe('genId', () => {
  it('会话内不重复（计数器单调递增）', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => genId()));
    expect(ids.size).toBe(1000);
  });
});

describe('createTextElement', () => {
  it('占画布一半宽、高 60，居中', () => {
    const el = createTextElement(doc);
    expect(el.type).toBe('text');
    expect(el.width).toBe(480);
    expect(el.height).toBe(60);
    expect(el.x).toBe((960 - 480) / 2);
    expect(el.y).toBe((540 - 60) / 2);
    expect(el.text).toBe('请输入文字');
  });

  it('不预置可选样式字段（缺省继承，与显式置空可区分）', () => {
    const el = createTextElement(doc);
    expect('fontFamily' in el).toBe(false);
    expect('bold' in el).toBe(false);
    expect('align' in el).toBe(false);
    expect('lineHeight' in el).toBe(false);
    expect('fill' in el).toBe(false);
  });
});

describe('createImageElement', () => {
  it('大图等比缩放到 fitRatio 范围内并居中', () => {
    const el = createImageElement('x', { width: 2000, height: 1000 }, doc);
    // maxWidth = 960*0.6 = 576, maxHeight = 540*0.6 = 324 → scale = 576/2000
    expect(el.width).toBe(576);
    expect(el.height).toBe(288);
    expect(el.x).toBe((960 - 576) / 2);
    expect(el.y).toBe((540 - 288) / 2);
  });

  it('小图不放大，fitRatio=1 时按整画布适配（背景图场景）', () => {
    expect(createImageElement('x', { width: 100, height: 50 }, doc).width).toBe(100);
    const bg = createImageElement('x', { width: 1920, height: 1080 }, doc, 1);
    expect(bg.width).toBe(960);
    expect(bg.height).toBe(540);
  });
});

describe('createTableElement', () => {
  it('行列结构与默认样式齐全', () => {
    const el = createTableElement(doc, 3, 4);
    expect(el.type).toBe('table');
    expect(el.data.length).toBe(3);
    expect(el.data[0].length).toBe(4);
    el.data.forEach((row) => {
      row.forEach((cell) => {
        expect(cell.id).toBeTruthy();
        expect(cell.text).toBe('');
      });
    });
    expect(el.colWidths).toEqual([0.25, 0.25, 0.25, 0.25]);
    // 单元格宽 960*0.8/4=192 超过 100 上限 → 钳制 100 → 总宽 400
    expect(el.width).toBe(400);
    expect(el.height).toBe(36 * 3);
  });

  it('单元格 id 全局唯一', () => {
    const a = createTableElement(doc, 8, 8);
    const ids = new Set(a.data.flat().map((c) => c.id));
    expect(ids.size).toBe(64);
  });
});

describe('createBizTextElement', () => {
  it('默认尺寸 / 样式与文本元素一致，仅 type 为 bizText', () => {
    const el = createBizTextElement(doc);
    expect(el.type).toBe('bizText');
    expect(el.width).toBe(480);
    expect(el.height).toBe(60);
    expect(el.x).toBe((960 - 480) / 2);
    expect(el.y).toBe((540 - 60) / 2);
    expect(el.fontSize).toBe(20);
  });
});

describe('createMediaElement / createMediaTextElement', () => {
  it('媒体 3:4 占比 200 宽并居中，不预置 src / optionPath / textId', () => {
    const el = createMediaElement(doc);
    expect(el.type).toBe('media');
    expect(el.width).toBe(200);
    expect(el.height).toBe(267);
    expect(el.x).toBe((960 - 200) / 2);
    // height 267 经工厂 Math.round，y 同样取整：(540-267)/2=136.5 → 137
    expect(el.y).toBe(137);
    expect('src' in el).toBe(false);
    expect('optionPath' in el).toBe(false);
    expect('textId' in el).toBe(false);
  });

  it('关联业务文本位于媒体正下方、同宽、高 44', () => {
    const media = createMediaElement(doc);
    const text = createMediaTextElement(media);
    expect(text.type).toBe('bizText');
    expect(text.x).toBe(media.x);
    expect(text.y).toBe(media.y + media.height + 12);
    expect(text.width).toBe(media.width);
    expect(text.height).toBe(44);
    expect(text.id).not.toBe(media.id);
  });
});

describe('createBizTableElement', () => {
  it('默认 3x3，结构与表格一致仅 type 为 bizTable', () => {
    const el = createBizTableElement(doc);
    expect(el.type).toBe('bizTable');
    expect(el.data.length).toBe(3);
    expect(el.data[0].length).toBe(3);
    expect(el.colWidths).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });

  it('自定义行列与表格工厂同构', () => {
    const el = createBizTableElement(doc, 2, 5);
    expect(el.data.length).toBe(2);
    expect(el.data[0].length).toBe(5);
    expect(el.width).toBe(createTableElement(doc, 2, 5).width);
  });
});
