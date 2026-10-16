/**
 * 编辑器文档状态（vue3）：文档 / 页面 / 选中编辑态的读写与元素增删改、
 * 页面增删复制排序、剪贴板与对齐工具。外部文档深拷贝接管，避免双向渗透。
 * 与 packages/vue2/src/useSlides.ts 为同构实现，修改时请双端同步。
 */
import { reactive, computed } from 'vue';
import { createEmptyDocument, genId, type PptDocumentModel, type PptSlideModel, type PptElementModel, type PptSlideType } from '@vue-ppt/core';

// 元素 / 页面深拷贝：doc 为 reactive Proxy，structuredClone 无法克隆（DataCloneError），
// 统一走 JSON 序列化（元素模型字段均为 JSON 兼容类型，vue2 端同款实现）
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function useSlides(options?: { document?: PptDocumentModel }) {
  // 外部传入的文档深拷贝后接管：编辑原地 mutate 调用方对象会造成双向渗透
  // （与 vue2 端行为对齐；元素模型字段均 JSON 兼容）
  const doc = reactive<PptDocumentModel>(
    options?.document
      ? deepClone(options.document)
      : {
          ...createEmptyDocument(),
          slides: [{ id: genId(), elements: [] }],
        }
  );

  const slideIndex = reactive({ value: 0 });
  const currentSlide = computed<PptSlideModel | undefined>(() => doc.slides[slideIndex.value]);

  // 选中 / 编辑态（单选）
  const selectedElementId = reactive({ value: '' });
  const editingElementId = reactive({ value: '' });

  // 编辑辅助 UI：标尺 / 参考线显隐与参考线位置（编辑器级状态，不进文档数据；
  // Toolbar 与画布容器（PptEditor/PptStage）经 state 共享）
  const showRuler = reactive({ value: false });
  const showGuides = reactive({ value: false });
  // 参考线位置（文档坐标）：x 为垂直线位置、y 为水平线位置，缺省居中
  const guides = reactive({
    value: {
      x: Math.round(doc.width / 2),
      y: Math.round(doc.height / 2),
    },
  });

  // 当前选中元素
  const selectedElement = computed<PptElementModel | null>(() => {
    const slide = doc.slides[slideIndex.value];
    if (!slide || !selectedElementId.value) return null;
    return slide.elements.find((e) => e.id === selectedElementId.value) ?? null;
  });

  function createSlide(type?: PptSlideType) {
    const slide: PptSlideModel = { id: genId(), elements: [] };
    // 自定义页为缺省值，不写入字段（与「缺省继承」设计一致）
    if (type && type !== 'custom') slide.slideType = type;
    doc.slides.splice(slideIndex.value + 1, 0, slide);
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
    const clone = deepClone(src);
    clone.id = genId();
    doc.slides.splice(i + 1, 0, clone);
    slideIndex.value = i + 1;
  }

  function moveSlide(from: number, to: number) {
    if (from === to) return;
    const [s] = doc.slides.splice(from, 1);
    doc.slides.splice(to, 0, s);
    slideIndex.value = to;
  }

  // 切换指定页类型（如缩略图右键快捷切换）
  function setSlideType(index: number, type: PptSlideType) {
    const slide = doc.slides[index];
    if (!slide) return;
    // 自定义页为缺省值：直接删除字段，保持数据最小化
    if (type === 'custom') delete slide.slideType;
    else slide.slideType = type;
  }

  // 更新当前页内指定元素的部分属性（如拖拽后的 x/y）
  function updateElement(id: string, props: Partial<PptElementModel>) {
    const el = doc.slides[slideIndex.value]?.elements.find((e) => e.id === id);
    if (!el) return;
    Object.assign(el, props);
  }

  // 向当前页插入元素，并默认选中
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

  // 复制元素：克隆并偏移一段距离，插到原元素之后
  function copyElement(id: string) {
    const slide = doc.slides[slideIndex.value];
    if (!slide) return;
    const i = slide.elements.findIndex((e) => e.id === id);
    if (i < 0) return;
    const clone = deepClone(slide.elements[i]) as PptElementModel;
    clone.id = genId();
    clone.x += 20;
    clone.y += 20;
    // 媒体元素：关联业务文本一并复制，克隆体 textId 指向新文本（保持拖动跟随 / 隐藏联动）
    let textClone: PptElementModel | null = null;
    let textOriginId = '';
    if (clone.type === 'media' && clone.textId) {
      const linkedText = slide.elements.find((e) => e.id === clone.textId);
      if (linkedText) {
        textOriginId = linkedText.id;
        textClone = deepClone(linkedText) as PptElementModel;
        textClone.id = genId();
        textClone.x += 20;
        textClone.y += 20;
        clone.textId = textClone.id;
      } else {
        delete clone.textId;
      }
    }
    slide.elements.splice(i + 1, 0, clone);
    // 关联文本克隆紧随原文本之后
    if (textClone) {
      const j = slide.elements.findIndex((e) => e.id === textOriginId);
      slide.elements.splice(j + 1, 0, textClone);
    }
    selectedElementId.value = clone.id;
    editingElementId.value = '';
  }

  // 调整元素层级：数组末尾为顶层
  function orderElement(id: string, command: 'up' | 'down' | 'top' | 'bottom') {
    const slide = doc.slides[slideIndex.value];
    if (!slide) return;
    const i = slide.elements.findIndex((e) => e.id === id);
    if (i < 0) return;
    const [el] = slide.elements.splice(i, 1);
    if (command === 'up') slide.elements.splice(Math.min(i + 1, slide.elements.length), 0, el);
    else if (command === 'down') slide.elements.splice(Math.max(i - 1, 0), 0, el);
    else if (command === 'top') slide.elements.push(el);
    else slide.elements.unshift(el);
  }

  // 元素相对画布对齐
  function alignElementToCanvas(id: string, command: 'horizontal' | 'vertical') {
    const el = doc.slides[slideIndex.value]?.elements.find((e) => e.id === id);
    if (!el) return;
    if (command === 'horizontal') el.x = Math.round((doc.width - el.width) / 2);
    else el.y = Math.round((doc.height - el.height) / 2);
  }

  // 内部剪贴板：复制暂存、粘贴时克隆插入
  const clipboard = reactive<{ value: PptElementModel | null }>({ value: null });

  // 复制指定元素到剪贴板（不动画布，配合粘贴按钮使用）
  function setClipboard(id: string) {
    const el = doc.slides[slideIndex.value]?.elements.find((e) => e.id === id);
    if (!el) return;
    clipboard.value = deepClone(el) as PptElementModel;
  }

  // 粘贴：克隆剪贴板元素，偏移一段距离插入当前页并选中。
  // 媒体元素成对克隆：与 copyElement 一致地重映射关联业务文本（找不到时清掉 textId，
  // 避免与原媒体共享同一 bizText 导致拖动/隐藏联动错乱）
  function pasteElement() {
    const slide = doc.slides[slideIndex.value];
    if (!slide || !clipboard.value) return;
    const clone = deepClone(clipboard.value) as PptElementModel;
    clone.id = genId();
    clone.x += 20;
    clone.y += 20;
    let textClone: PptElementModel | null = null;
    if (clone.type === 'media' && clone.textId) {
      const linkedText = slide.elements.find((e) => e.id === clone.textId);
      if (linkedText) {
        textClone = deepClone(linkedText) as PptElementModel;
        textClone.id = genId();
        textClone.x += 20;
        textClone.y += 20;
        clone.textId = textClone.id;
      } else {
        delete clone.textId;
      }
    }
    slide.elements.push(clone);
    if (textClone) slide.elements.push(textClone);
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
    showRuler,
    showGuides,
    guides,
    clipboard,
    createSlide,
    deleteSlide,
    copySlide,
    moveSlide,
    setSlideType,
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
