/**
 * 元素编辑快捷键（双端共享）：
 * - Ctrl/Cmd + C 复制到剪贴板、Ctrl/Cmd + V 粘贴、Ctrl/Cmd + D 直接克隆
 * - Delete / Backspace 删除选中元素
 * - 方向键微移 1 单位（Shift ×10）
 * - Escape 退出元素编辑态，再按取消选中
 *
 * 焦点在富文本编辑器（.ProseMirror）/ 表单控件内时不接管：
 * 富文本命令（加粗等）与系统复制粘贴优先；富文本内的 Escape 由编辑器自行处理（提交编辑）。
 *
 * 说明：处理器为 document 级监听，同一页面挂载多个编辑器实例时按键会作用于
 * 每个实例（与 useCanvasScale 的缩放快捷键一致）；单实例为主场景。
 */
import type { PptElementModel } from './index';

/** useSlides 返回值中快捷键所需的状态子集（结构类型，双端兼容） */
export interface HotkeyState {
  selectedElement: { value: PptElementModel | null };
  selectedElementId: { value: string };
  editingElementId: { value: string };
  clipboard: { value: PptElementModel | null };
  setClipboard(id: string): void;
  pasteElement(): void;
  copyElement(id: string): void;
  removeElement(id: string): void;
  updateElement(id: string, props: Partial<PptElementModel>): void;
}

/**
 * 多实例作用域：document 级监听下，同页多个编辑器实例同时挂载快捷键时，
 * 仅「最近交互（编辑器根节点 mousedown）」的实例接管按键，避免一处按键
 * 在其他实例造成无感知删除/粘贴。传 null 重置（未标记前所有实例生效，
 * 单实例场景行为不变）。
 */
let activeHotkeyScope: object | null = null;

export function markHotkeyScope(scope: object | null): void {
  activeHotkeyScope = scope;
}

/** 焦点是否在输入类元素 / 富文本编辑器内（不接管系统与编辑器快捷键） */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.closest) return false;
  return !!el.closest('input, textarea, select, .ProseMirror, [contenteditable="true"]');
}

/** 方向键 → 坐标增量（文档单位） */
const ARROW_DELTAS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

export function createHotkeyHandler(state: HotkeyState): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    // 多实例作用域：最近交互实例以外的 handler 直接放行（单实例 / 未交互时全生效）
    if (activeHotkeyScope !== null && activeHotkeyScope !== state) return;

    const editable = isEditableTarget(e.target);

    if (e.key === 'Escape') {
      // 富文本内的 Escape 由编辑器处理（提交编辑）；此处只处理元素级退出
      if (editable) return;
      if (state.editingElementId.value) {
        state.editingElementId.value = '';
        return;
      }
      if (state.selectedElementId.value) state.selectedElementId.value = '';
      return;
    }

    if (editable) return;

    const mod = e.ctrlKey || e.metaKey;
    const selected = state.selectedElement.value;

    if (mod && (e.key === 'c' || e.key === 'C')) {
      if (selected) state.setClipboard(selected.id);
      // 不 preventDefault：保留系统复制行为（如页面存在选中文本）
      return;
    }
    if (mod && (e.key === 'v' || e.key === 'V')) {
      if (state.clipboard.value) {
        e.preventDefault();
        state.pasteElement();
      }
      return;
    }
    if (mod && (e.key === 'd' || e.key === 'D')) {
      if (selected) {
        e.preventDefault();
        state.copyElement(selected.id);
      }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selected) {
        e.preventDefault();
        state.removeElement(selected.id);
      }
      return;
    }

    // 方向键微移：Shift ×10
    const delta = ARROW_DELTAS[e.key];
    if (delta && selected) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      state.updateElement(selected.id, {
        x: selected.x + delta[0] * step,
        y: selected.y + delta[1] * step,
      });
    }
  };
}
