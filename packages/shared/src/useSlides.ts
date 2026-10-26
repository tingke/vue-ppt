/**
 * 编辑器文档状态（vue2 / vue3 双端共享，P1-2 单源）：
 * 文档 / 页面 / 选中编辑态的读写与元素增删改、页面增删复制排序、剪贴板与对齐工具。
 *
 * - reactivity 一律经 '@vpk/vue-api' 导入：vue2 端由构建 alias 落到 src/vue-api.ts
 *   （2.7 内置 / 2.6 @vue/composition-api 运行时择轨），vue3 端落到 src/vue-api.ts（re-export 'vue'）
 * - vue2 响应式基于 defineProperty：新增字段必须走 set()（Vue.set），删除走 del()（Vue.delete）；
 *   vue3 端二者为普通赋值 / delete，语义一致
 * - 外部文档深拷贝接管，避免双向渗透；与 packages/{vue2,vue3}/src/useSlides.ts 的 shim 转发配套
 */
import { reactive, computed, set, del } from '@vpk/vue-api';
import { createEmptyDocument, createHistory, genId } from '@tthappy/ppt-core';
import type { PptDocumentModel, PptElementModel, PptSlideModel, PptSlideType } from '@tthappy/ppt-core';

// 元素 / 页面深拷贝：doc 为 reactive Proxy，structuredClone 无法克隆（DataCloneError），
// 统一走 JSON 序列化（元素模型字段均为 JSON 兼容类型，vue2 需兼容不支持 structuredClone 的旧浏览器）
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function useSlides(options?: { document?: PptDocumentModel }) {
  // 外部传入的文档深拷贝后接管：编辑原地 mutate 调用方对象会造成双向渗透。
  // 缺 slides 数组的残缺文档（如后端初始模板返回空对象）按空文档兜底，
  // 避免 doc.slides undefined 连锁崩溃
  const external = options?.document && Array.isArray(options.document.slides)
    ? deepClone(options.document)
    : null;
  const doc = reactive<PptDocumentModel>(
    external ?? {
      ...createEmptyDocument(),
      slides: [{ id: genId(), elements: [] }],
    }
  );

  const slideIndex = reactive({ value: 0 });
  const currentSlide = computed<PptSlideModel | undefined>(() => doc.slides[slideIndex.value]);

  // 选中 / 编辑态（单选）
  const selectedElementId = reactive({ value: '' });
  const editingElementId = reactive({ value: '' });

  // ==================== 撤销 / 重做（文档快照历史，编辑器实例内独立） ====================
  //
  // post-state 模型：初始帧在下方 history.clear() 写入，此后每个 mutator 变更成功后
  // recordHistory() 记录结果态，undo/redo 恢复相邻帧。快照内容为 slides 全量 + 页码，
  // 撤销删除页等操作后天然回到操作时所在页；选中 / 编辑态不进快照（恢复后清空，
  // 避免指向已不存在或换位的元素）。拖拽 / 连续输入等高频变更经 tag 合并为一步。

  /** 文档历史快照：slides 全量 + 当前页码 */
  interface SlidesHistorySnapshot {
    slides: PptSlideModel[];
    slideIndex: number;
  }

  const history = createHistory<SlidesHistorySnapshot>();

  // 供工具栏置灰的响应式开关（历史栈本体无响应式需求）
  const canUndo = reactive({ value: false });
  const canRedo = reactive({ value: false });

  function syncHistoryFlags() {
    canUndo.value = history.canUndo();
    canRedo.value = history.canRedo();
  }

  // 当前文档状态快照（JSON 深拷贝，避免历史帧与响应式文档共享引用被原地改写）
  function takeSnapshot(): SlidesHistorySnapshot {
    return { slides: deepClone(doc.slides), slideIndex: slideIndex.value };
  }

  // 变更后记录结果态；tag 相同且在时间窗内的连续调用替换栈顶（见 core createHistory）
  function recordHistory(tag?: string) {
    history.record(takeSnapshot(), tag);
    syncHistoryFlags();
  }

  // 恢复快照：splice 原位整体替换页面数组（vue2 defineProperty 下新对象随 splice
  // 自动转为响应式）；历史帧再深拷贝一次，恢复后的对象与栈内帧不共享引用
  function restoreSnapshot(s: SlidesHistorySnapshot) {
    doc.slides.splice(0, doc.slides.length, ...deepClone(s.slides));
    slideIndex.value = Math.min(s.slideIndex, doc.slides.length - 1);
    selectedElementId.value = '';
    editingElementId.value = '';
  }

  function undo() {
    const s = history.undo();
    if (!s) return;
    restoreSnapshot(s);
    syncHistoryFlags();
  }

  function redo() {
    const s = history.redo();
    if (!s) return;
    restoreSnapshot(s);
    syncHistoryFlags();
  }

  // 写入初始帧
  history.clear(takeSnapshot());
  syncHistoryFlags();

  // 编辑辅助 UI：标尺 / 参考线显隐与参考线位置（编辑器级状态，不进文档数据；
  // Toolbar 与画布容器（PptStage/PptEditor）经 state 共享）
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
    recordHistory();
  }

  function deleteSlide(index?: number) {
    const i = index ?? slideIndex.value;
    if (doc.slides.length <= 1) return;
    doc.slides.splice(i, 1);
    if (slideIndex.value >= doc.slides.length) slideIndex.value = doc.slides.length - 1;
    recordHistory();
  }

  function copySlide(index?: number) {
    const i = index ?? slideIndex.value;
    const clone = deepClone(doc.slides[i]);
    clone.id = genId();
    doc.slides.splice(i + 1, 0, clone);
    slideIndex.value = i + 1;
    recordHistory();
  }

  function moveSlide(from: number, to: number) {
    if (from === to) return;
    const [s] = doc.slides.splice(from, 1);
    doc.slides.splice(to, 0, s);
    slideIndex.value = to;
    recordHistory();
  }

  // 切换指定页类型（如缩略图右键快捷切换）。
  // slideType 可能是页面对象上不存在的字段：vue2 必须走 set / del 保证响应式（del = Vue.delete）
  function setSlideType(index: number, type: PptSlideType) {
    const slide = doc.slides[index];
    if (!slide) return;
    if (type === 'custom') del(slide as unknown as Record<string, unknown>, 'slideType');
    else set(slide as unknown as Record<string, unknown>, 'slideType', type);
    recordHistory();
  }

  // 更新当前页内指定元素的部分属性（如拖拽后的 x/y）。
  // 富文本新增的 bold / align / lineHeight / fill / fontFamily 等字段可能不存在于对象上，
  // vue2 直接赋值不触发更新，必须逐字段走 set。
  // options.historyTag：连续手势标记（如 'drag' / 'type'），时间窗内合并为一步历史
  function updateElement(id: string, props: Partial<PptElementModel>, options?: { historyTag?: string }) {
    const el = doc.slides[slideIndex.value]?.elements.find((e) => e.id === id);
    if (!el) return;
    (Object.keys(props) as (keyof PptElementModel)[]).forEach((key) => {
      set(el as unknown as Record<string, unknown>, key, (props as Record<string, unknown>)[key]);
    });
    recordHistory(options?.historyTag);
  }

  // 向当前页插入元素，并默认选中
  function addElement(element: PptElementModel) {
    const slide = doc.slides[slideIndex.value];
    if (!slide) return;
    slide.elements.push(element);
    selectedElementId.value = element.id;
    editingElementId.value = '';
    recordHistory();
  }

  // 删除当前页内指定元素（如文本编辑后内容为空时）
  function removeElement(id: string) {
    const slide = doc.slides[slideIndex.value];
    if (!slide) return;
    const i = slide.elements.findIndex((e) => e.id === id);
    if (i >= 0) slide.elements.splice(i, 1);
    if (selectedElementId.value === id) selectedElementId.value = '';
    if (editingElementId.value === id) editingElementId.value = '';
    recordHistory();
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
        del(clone as unknown as Record<string, unknown>, 'textId');
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
    recordHistory();
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
    recordHistory();
  }

  // 元素相对画布对齐
  function alignElementToCanvas(id: string, command: 'horizontal' | 'vertical') {
    const el = doc.slides[slideIndex.value]?.elements.find((e) => e.id === id);
    if (!el) return;
    if (command === 'horizontal') el.x = Math.round((doc.width - el.width) / 2);
    else el.y = Math.round((doc.height - el.height) / 2);
    recordHistory();
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
        del(clone as unknown as Record<string, unknown>, 'textId');
      }
    }
    slide.elements.push(clone);
    if (textClone) slide.elements.push(textClone);
    selectedElementId.value = clone.id;
    editingElementId.value = '';
    recordHistory();
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
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

export default useSlides;
