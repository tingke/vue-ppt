import { reactive, computed } from 'vue';
import { createEmptyDocument, type PptDocumentModel, type PptSlideModel } from '@vue-ppt-kit/core';

export function useSlides(options?: { document?: PptDocumentModel }) {
  const doc = reactive<PptDocumentModel>(
    options?.document ?? {
      ...createEmptyDocument(),
      slides: [{ id: genId(), elements: [] }],
    }
  );

  const slideIndex = reactive({ value: 0 });
  const currentSlide = computed<PptSlideModel | undefined>(() => doc.slides[slideIndex.value]);

  function genId() {
    return Math.random().toString(36).slice(2, 10);
  }

  function createSlide() {
    doc.slides.splice(slideIndex.value + 1, 0, { id: genId(), elements: [] });
    slideIndex.value += 1;
  }

  function deleteSlide(index?: number) {
    const i = index ?? slideIndex.value;
    if (doc.slides.length <= 1) return;
    doc.slides.splice(i, 1);
    if (slideIndex.value >= doc.slides.length) slideIndex.value = doc.slides.length - 1;
  }

  function copySlide(index?: number) {
    const i = index ?? slideIndex.value;
    const src = doc.slides[i];
    doc.slides.splice(i + 1, 0, JSON.parse(JSON.stringify({ ...src, id: genId() })));
    slideIndex.value = i + 1;
  }

  function moveSlide(from: number, to: number) {
    if (from === to) return;
    const [s] = doc.slides.splice(from, 1);
    doc.slides.splice(to, 0, s);
    slideIndex.value = to;
  }

  return { doc, slideIndex, currentSlide, createSlide, deleteSlide, copySlide, moveSlide };
}
