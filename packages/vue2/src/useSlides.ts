import Vue from 'vue';
import { computed, reactive } from '@vue/composition-api';
import { createEmptyDocument, genId, PptDocumentModel, PptElementModel } from '@vue-ppt-kit/core';

interface SlidesState {
  doc: PptDocumentModel;
  slideIndex: { value: number };
  currentSlide: ReturnType<typeof computed>;
  selectedElementId: { value: string };
  selectedElement: ReturnType<typeof computed>;
  editingElementId: { value: string };
  clipboard: { value: PptElementModel | null };
  createSlide: () => void;
  deleteSlide: (index?: number) => void;
  copySlide: (index?: number) => void;
  moveSlide: (from: number, to: number) => void;
  updateElement: (id: string, props: Partial<PptElementModel>) => void;
  addElement: (element: PptElementModel) => void;
  removeElement: (id: string) => void;
  copyElement: (id: string) => void;
  orderElement: (id: string, command: 'up' | 'down' | 'top' | 'bottom') => void;
  alignElementToCanvas: (id: string, command: 'horizontal' | 'vertical') => void;
  setClipboard: (id: string) => void;
  pasteElement: () => void;
}

// genId / 元素工厂 / 预设等共享逻辑由 @vue-ppt-kit/core 提供（双端一致）
// 注：克隆沿用 JSON 深拷贝（vue2 需兼容不支持 structuredClone 的旧浏览器）

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

  // 当前选中元素
  const selectedElement = computed<PptElementModel | null>(() => {
    const slide = doc.slides[slideIndex.value];
    if (!slide || !selectedElementId.value) return null;
    return slide.elements.find((e) => e.id === selectedElementId.value) || null;
  });

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
    // Vue 2 响应式基于 defineProperty：对象上不存在的字段（如富文本新增的
    // bold / align / lineHeight / fill / fontFamily）直接赋值不会触发更新，
    // 必须走 Vue.set；已存在字段 Vue.set 等价于直接赋值
    Object.keys(props).forEach((key) => {
      Vue.set(el as unknown as Record<string, unknown>, key, (props as Record<string, unknown>)[key]);
    });
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

  // 复制元素：克隆并偏移一段距离，插到原元素之后（参考 PPTist copyElement）
  function copyElement(id: string) {
    const slide = doc.slides[slideIndex.value];
    if (!slide) return;
    const i = slide.elements.findIndex((e) => e.id === id);
    if (i < 0) return;
    const clone = JSON.parse(JSON.stringify(slide.elements[i])) as PptElementModel;
    clone.id = genId();
    clone.x += 20;
    clone.y += 20;
    slide.elements.splice(i + 1, 0, clone);
    selectedElementId.value = clone.id;
    editingElementId.value = '';
  }

  // 调整元素层级：数组末尾为顶层（参考 PPTist useOrderElement）
  function orderElement(id: string, command: 'up' | 'down' | 'top' | 'bottom') {
    const slide = doc.slides[slideIndex.value];
    if (!slide) return;
    const i = slide.elements.findIndex((e) => e.id === id);
    if (i < 0) return;
    const removed = slide.elements.splice(i, 1)[0];
    if (command === 'up') slide.elements.splice(Math.min(i + 1, slide.elements.length), 0, removed);
    else if (command === 'down') slide.elements.splice(Math.max(i - 1, 0), 0, removed);
    else if (command === 'top') slide.elements.push(removed);
    else slide.elements.unshift(removed);
  }

  // 元素相对画布对齐（参考 PPTist useAlignElementToCanvas）
  function alignElementToCanvas(id: string, command: 'horizontal' | 'vertical') {
    const el = (doc.slides[slideIndex.value]?.elements || []).find((e) => e.id === id);
    if (!el) return;
    if (command === 'horizontal') el.x = Math.round((doc.width - el.width) / 2);
    else el.y = Math.round((doc.height - el.height) / 2);
  }

  // 内部剪贴板（参考 PPTist mainStore 的 clipboard）：复制暂存、粘贴时克隆插入
  const clipboard = reactive<{ value: PptElementModel | null }>({ value: null });

  // 复制指定元素到剪贴板（不动画布，配合粘贴按钮使用）
  function setClipboard(id: string) {
    const el = (doc.slides[slideIndex.value]?.elements || []).find((e) => e.id === id);
    if (!el) return;
    clipboard.value = JSON.parse(JSON.stringify(el)) as PptElementModel;
  }

  // 粘贴：克隆剪贴板元素，偏移一段距离插入当前页并选中
  function pasteElement() {
    const slide = doc.slides[slideIndex.value];
    if (!slide || !clipboard.value) return;
    const clone = JSON.parse(JSON.stringify(clipboard.value)) as PptElementModel;
    clone.id = genId();
    clone.x += 20;
    clone.y += 20;
    slide.elements.push(clone);
    selectedElementId.value = clone.id;
    editingElementId.value = '';
  }

  return {
    doc,
    slideIndex,
    currentSlide,
    selectedElementId,
    selectedElement,
    editingElementId,
    clipboard,
    createSlide,
    deleteSlide,
    copySlide,
    moveSlide,
    updateElement,
    addElement,
    removeElement,
    copyElement,
    orderElement,
    alignElementToCanvas,
    setClipboard,
    pasteElement,
  };
}

export default useSlides;
