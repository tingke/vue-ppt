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

export type PptElementModel = PptTextElement | PptImageElement | PptShapeElement;

export interface PptBaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface PptTextElement extends PptBaseElement {
  type: 'text';
  text: string;
  fontSize?: number;
  color?: string;
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

/** Placeholder API. A real implementation must unzip and parse OOXML relationships. */
export async function parsePptx(_source: ArrayBuffer | Blob | string): Promise<PptDocumentModel> {
  throw new Error('parsePptx is not implemented yet. Add ZIP/OOXML parsing before using real PPTX files.');
}

export function createEmptyDocument(): PptDocumentModel {
  return { width: 960, height: 540, slides: [], warnings: [] };
}
