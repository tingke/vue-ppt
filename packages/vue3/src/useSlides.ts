import { reactive, computed } from 'vue';
import { createEmptyDocument, type PptDocumentModel, type PptSlideModel, type PptElementModel } from '@vue-ppt-kit/core';

export function useSlides(options?: { document?: PptDocumentModel }) {
  const doc = reactive<PptDocumentModel>(
    options?.document ?? {
      ...createEmptyDocument(),
      slides: [{ id: genId(), elements: [] }],
    }
  );

  const slideIndex = reactive({ value: 0 });
  const currentSlide = computed<PptSlideModel | undefined>(() => doc.slides[slideIndex.value]);

  // 选中 / 编辑态（参考 PPTist store 的 activeElementIdList 简化为单选）
  const selectedElementId = reactive({ value: '' });
  const editingElementId = reactive({ value: '' });

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

  // 更新当前页内指定元素的部分属性（如拖拽后的 x/y）
  function updateElement(id: string, props: Partial<PptElementModel>) {
    const el = doc.slides[slideIndex.value]?.elements.find((e) => e.id === id);
    if (!el) return;
    Object.assign(el, props);
  }

  // 向当前页插入元素（参考 PPTist slidesStore.addElement），并默认选中
  function addElement(element: PptElementModel) {
    const slide = doc.slides[slideIndex.value];
    if (!slide) return;
    slide.elements.push(element);
    selectedElementId.value = element.id;
    editingElementId.value = '';
  }

  // 删除当前页内指定元素（如文本编辑后内容为空时）
  function removeElement(id: string) {
    const slide = doc.slides[slideIndex.value];
    if (!slide) return;
    const i = slide.elements.findIndex((e) => e.id === id);
    if (i >= 0) slide.elements.splice(i, 1);
    if (selectedElementId.value === id) selectedElementId.value = '';
    if (editingElementId.value === id) editingElementId.value = '';
  }

  return {
    doc,
    slideIndex,
    currentSlide,
    selectedElementId,
    editingElementId,
    createSlide,
    deleteSlide,
    copySlide,
    moveSlide,
    updateElement,
    addElement,
    removeElement,
  };
}
