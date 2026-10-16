/**
 * 元素工厂与 id 生成（vue2 / vue3 双端共享）：
 * 工具栏「插入」只负责选类型与时机，元素的默认尺寸 / 样式 / 位置统一在此维护，
 * 保证双端插入行为一致。图片文件读取工具也集中在此。
 */
import type { PptBizTableElement, PptBizTextElement, PptImageElement, PptMediaElement, PptTableElement, PptTableCell, PptTextElement } from './index';

let idCounter = 0;

/**
 * 生成 id：会话内递增计数器 + 随机后缀。
 * 纯随机短 id 在批量创建（如表格单元格）时有碰撞概率，计数器保证会话内唯一。
 */
export function genId(): string {
  idCounter += 1;
  return idCounter.toString(36) + Math.random().toString(36).slice(2, 8);
}

interface DocSize {
  width: number;
  height: number;
}

/** 插入文本元素：占画布一半宽、高 60，居中 */
export function createTextElement(doc: DocSize): PptTextElement {
  const width = Math.round(doc.width * 0.5);
  const height = 60;
  return {
    id: genId(),
    type: 'text',
    x: Math.round((doc.width - width) / 2),
    y: Math.round((doc.height - height) / 2),
    width,
    height,
    text: '请输入文字',
    fontSize: 20,
    color: '#303133',
    // 其余可选属性（fontFamily/bold/align/lineHeight/fill）按「缺省继承」设计不预置：
    // 渲染层对缺省值兜底，且可区分「未设置」与「显式置空」
  };
}

/** 插入业务文本元素：默认尺寸 / 样式与文本元素一致（业务字段 tag 经 fx 选择后插入） */
export function createBizTextElement(doc: DocSize): PptBizTextElement {
  return { ...createTextElement(doc), type: 'bizText' };
}

/**
 * 插入媒体元素：宽 200，高为 3:4 图片高（267）。点击图片弹出级联选照片，
 * 关联业务文本经 createMediaTextElement 一并创建（见下）。
 */
export function createMediaElement(doc: DocSize): PptMediaElement {
  const width = 200;
  const height = Math.round((width * 4) / 3);
  return {
    id: genId(),
    type: 'media',
    x: Math.round((doc.width - width) / 2),
    y: Math.round((doc.height - height) / 2),
    width,
    height,
  };
}

/**
 * 媒体关联的业务文本：独立 bizText 元素，位于媒体正下方、同宽、高 44。
 * 可随意拖动 / 独立删除；媒体经 textId 关联，拖动媒体时跟随移动。
 */
export function createMediaTextElement(media: { x: number; y: number; width: number; height: number }): PptBizTextElement {
  return {
    id: genId(),
    type: 'bizText',
    x: media.x,
    y: media.y + media.height + 12,
    width: media.width,
    height: 44,
    text: '',
    fontSize: 14,
    color: '#303133',
  };
}

/** 插入图片元素：按原图比例缩放至画布 fitRatio 比例范围内并居中 */
export function createImageElement(
  src: string,
  img: { width: number; height: number },
  doc: DocSize,
  fitRatio = 0.6
): PptImageElement {
  const scale = Math.min(1, (doc.width * fitRatio) / img.width, (doc.height * fitRatio) / img.height);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  return {
    id: genId(),
    type: 'image',
    x: Math.round((doc.width - width) / 2),
    y: Math.round((doc.height - height) / 2),
    width,
    height,
    src,
  };
}

/** 插入表格元素：单元格宽 ≤100、高 36，宽度占画布 80% 并居中 */
export function createTableElement(row: number, col: number, doc: DocSize): PptTableElement {
  const cellWidth = Math.min(100, (doc.width * 0.8) / col);
  const cellHeight = 36;
  const width = Math.round(cellWidth * col);
  const height = cellHeight * row;
  const data: PptTableCell[][] = [];
  for (let r = 0; r < row; r++) {
    const rowCells: PptTableCell[] = [];
    for (let c = 0; c < col; c++) rowCells.push({ id: genId(), text: '', colspan: 1, rowspan: 1 });
    data.push(rowCells);
  }
  return {
    id: genId(),
    type: 'table',
    x: Math.round((doc.width - width) / 2),
    y: Math.round((doc.height - height) / 2),
    width,
    height,
    data,
    colWidths: new Array(col).fill(1 / col),
    outlineColor: '#dcdcdc',
    headerFill: '#ecf5ff',
    headerColor: '#409eff',
    fontSize: 14,
    color: '#606266',
  };
}

/** 插入富表格元素：结构与表格一致（单元格为业务文本，支持 fx 业务字段混排），默认 3x3 */
export function createBizTableElement(doc: DocSize, row = 3, col = 3): PptBizTableElement {
  return { ...createTableElement(row, col, doc), type: 'bizTable' };
}

/** 加载图片并获取原始尺寸（dataURL / 图片链接均可） */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 读取文件为 dataURL */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** 选择本地图片文件 → dataURL + 原始尺寸 */
export async function readFileAsImage(file: File): Promise<{ src: string; img: HTMLImageElement }> {
  const src = await readFileAsDataURL(file);
  const img = await loadImage(src);
  return { src, img };
}
