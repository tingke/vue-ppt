import Vue from 'vue';
import { computed, reactive } from '@vue/composition-api';
import { createEmptyDocument, PptDocumentModel } from '@vue-ppt-kit/core';

interface SlidesState {
  doc: PptDocumentModel;
  slideIndex: { value: number };
  currentSlide: ReturnType<typeof computed>;
  createSlide: () => void;
  deleteSlide: (index?: number) => void;
  copySlide: (index?: number) => void;
  moveSlide: (from: number, to: number) => void;
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function useSlides(options?: { document?: PptDocumentModel }): SlidesState {
  const doc = reactive<PptDocumentModel>(
    options && options.document
      ? JSON.parse(JSON.stringify(options.document))
      : Object.assign({}, createEmptyDocument(), {
          slides: [{ id: genId(), elements: [] }] as PptDocumentModel['slides'],
        })
  );

  const slideIndex = reactive({ value: 0 });
  const currentSlide = computed(() => doc.slides[slideIndex.value]);

  function createSlide() {
    doc.slides.splice(slideIndex.value + 1, 0, { id: genId(), elements: [] });
    slideIndex.value += 1;
  }

  function deleteSlide(index?: number) {
    const i = typeof index === 'number' ? index : slideIndex.value;
    if (doc.slides.length <= 1) return;
    doc.slides.splice(i, 1);
    if (slideIndex.value >= doc.slides.length) slideIndex.value = doc.slides.length - 1;
  }

  function copySlide(index?: number) {
    const i = typeof index === 'number' ? index : slideIndex.value;
    const clone = JSON.parse(JSON.stringify(doc.slides[i]));
    clone.id = genId();
    doc.slides.splice(i + 1, 0, clone);
    slideIndex.value = i + 1;
  }

  function moveSlide(from: number, to: number) {
    if (from === to) return;
    const removed = doc.slides.splice(from, 1)[0];
    doc.slides.splice(to, 0, removed);
    slideIndex.value = to;
  }

  return { doc, slideIndex, currentSlide, createSlide, deleteSlide, copySlide, moveSlide };
}

export default useSlides;
Vue; // keep Vue import for typings
