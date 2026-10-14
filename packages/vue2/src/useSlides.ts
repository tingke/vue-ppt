import Vue from 'vue';
import { computed, reactive } from '@vue/composition-api';
import { createEmptyDocument, PptDocumentModel, PptElementModel } from '@vue-ppt-kit/core';

interface SlidesState {
  doc: PptDocumentModel;
  slideIndex: { value: number };
  currentSlide: ReturnType<typeof computed>;
  selectedElementId: { value: string };
  editingElementId: { value: string };
  createSlide: () => void;
  deleteSlide: (index?: number) => void;
  copySlide: (index?: number) => void;
  moveSlide: (from: number, to: number) => void;
  updateElement: (id: string, props: Partial<PptElementModel>) => void;
  addElement: (element: PptElementModel) => void;
  removeElement: (id: string) => void;
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

  // 选中 / 编辑态（参考 PPTist store 的 activeElementIdList 简化为单选）
  const selectedElementId = reactive({ value: '' });
  const editingElementId = reactive({ value: '' });

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

  // 更新当前页内指定元素的部分属性（如拖拽后的 x/y）
  function updateElement(id: string, props: Partial<PptElementModel>) {
    const elements = doc.slides[slideIndex.value]?.elements || [];
    const el = elements.find((e) => e.id === id);
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

export default useSlides;
Vue; // keep Vue import for typings
