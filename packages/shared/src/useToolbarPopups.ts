/**
 * 工具栏四套弹层状态机单源（vue2 / vue3 双端共享，P1-3）：
 * 表格 / 富表格 / 幻灯片类型 / 颜色 的 toggle / close / 锚点定位 ×双端 ×2 份重复收敛为 1 份。
 * 弹层均 fixed 定位（相对视口），避免被工具栏横向滚动容器裁剪；
 * 工具栏滚动时收起全部弹层，点击「打开中的弹层及其触发按钮」之外时收起（捕获阶段监听）。
 */
import { computed, ref } from '@vpk/vue-api';

/** 弹层固定宽度（锚点收敛计算用，单一常量源，P5 弹层宽度收口） */
export const TOOLBAR_POPUP_WIDTH = {
  /** 新建幻灯片类型下拉 */
  slideType: 170,
  /** 颜色弹层 */
  color: 196,
  /** 表格 / 富表格行列选择器 */
  table: 224,
} as const;

export type ColorAnchor = 'fill' | 'fontColor';

/** 弹层定位样式（宽松 Record：CSSProperties 为 vue3 类型面，vue2 端不具备） */
export type PopupStyle = Record<string, string>;

export function useToolbarPopups(getRoot: () => HTMLElement | null) {
  // 颜色弹层锚点（null 为收起）
  const colorAnchor = ref<ColorAnchor | null>(null);
  const colorPopupStyle = ref<PopupStyle>({});

  const tablePickerVisible = ref(false);
  const tablePopupStyle = ref<PopupStyle>({});

  // 富表格选择器（与表格共用 TablePicker，两者互斥展开）
  const bizTablePickerVisible = ref(false);
  const bizTablePopupStyle = ref<PopupStyle>({});

  const slideTypeMenuVisible = ref(false);
  const slideTypePopupStyle = ref<PopupStyle>({});

  const anyPopupOpen = computed(
    () => !!colorAnchor.value || tablePickerVisible.value || bizTablePickerVisible.value || slideTypeMenuVisible.value
  );

  // 依据触发按钮位置计算弹层坐标（fixed 定位），超出视口右缘时向左收敛
  function anchorPopupStyle(e: Event, width: number): PopupStyle {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    return { left: left + 'px', top: rect.bottom + 6 + 'px' };
  }

  function toggleColorPicker(anchor: ColorAnchor, e: Event) {
    colorAnchor.value = colorAnchor.value === anchor ? null : anchor;
    if (colorAnchor.value) colorPopupStyle.value = anchorPopupStyle(e, TOOLBAR_POPUP_WIDTH.color);
  }

  // 表格选择器：网格 / 自定义行列与元素构造在 TablePicker 内
  function toggleTablePicker(e: Event) {
    closeBizTablePicker();
    tablePickerVisible.value = !tablePickerVisible.value;
    if (tablePickerVisible.value) tablePopupStyle.value = anchorPopupStyle(e, TOOLBAR_POPUP_WIDTH.table);
  }
  function closeTablePicker() {
    tablePickerVisible.value = false;
  }

  // 富表格选择器：与表格共用 TablePicker（biz 模式），两者互斥展开
  function toggleBizTablePicker(e: Event) {
    closeTablePicker();
    bizTablePickerVisible.value = !bizTablePickerVisible.value;
    if (bizTablePickerVisible.value) bizTablePopupStyle.value = anchorPopupStyle(e, TOOLBAR_POPUP_WIDTH.table);
  }
  function closeBizTablePicker() {
    bizTablePickerVisible.value = false;
  }

  // 新建幻灯片：点击弹出类型下拉（候选项取 core SLIDE_TYPES）
  function toggleSlideTypeMenu(e: Event) {
    slideTypeMenuVisible.value = !slideTypeMenuVisible.value;
    if (slideTypeMenuVisible.value) slideTypePopupStyle.value = anchorPopupStyle(e, TOOLBAR_POPUP_WIDTH.slideType);
  }
  function closeSlideTypeMenu() {
    slideTypeMenuVisible.value = false;
  }

  // 工具栏横向滚动时收起弹层，避免弹层与触发按钮错位
  function closePopups() {
    colorAnchor.value = null;
    closeTablePicker();
    closeBizTablePicker();
    closeSlideTypeMenu();
  }

  // 点击「打开中的弹层及其触发按钮」之外时收起：
  // 包括工具栏内其他区域、画布与页面任意位置（捕获阶段监听，画布元素 stopPropagation 也不影响）
  function onOutsideClick(e: MouseEvent) {
    const target = e.target as Node;
    // 打开中的弹层与其触发按钮视为「内部」：点击它们由各自的 toggle/选择逻辑处理
    // （表格与富表格共用 .vpk-table-picker 弹层，同一时刻只开一个）
    const root = getRoot();
    if (!root) return;
    const popup = tablePickerVisible.value || bizTablePickerVisible.value
      ? root.querySelector('.vpk-table-picker')
      : colorAnchor.value
        ? root.querySelector('.vpk-color-popup')
        : slideTypeMenuVisible.value
          ? root.querySelector('.vpk-slide-type-menu')
          : null;
    if (popup) {
      const anchor = popup.closest('.vpk-tool-anchor');
      if (anchor && anchor.contains(target)) return;
    }
    if (colorAnchor.value) colorAnchor.value = null;
    if (tablePickerVisible.value) closeTablePicker();
    if (bizTablePickerVisible.value) closeBizTablePicker();
    if (slideTypeMenuVisible.value) closeSlideTypeMenu();
  }

  return {
    colorAnchor,
    colorPopupStyle,
    tablePickerVisible,
    tablePopupStyle,
    bizTablePickerVisible,
    bizTablePopupStyle,
    slideTypeMenuVisible,
    slideTypePopupStyle,
    anyPopupOpen,
    toggleColorPicker,
    toggleTablePicker,
    closeTablePicker,
    toggleBizTablePicker,
    closeBizTablePicker,
    toggleSlideTypeMenu,
    closeSlideTypeMenu,
    closePopups,
    onOutsideClick,
  };
}

export default useToolbarPopups;
