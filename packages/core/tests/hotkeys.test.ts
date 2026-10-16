// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHotkeyHandler, markHotkeyScope, type HotkeyState } from '../src/hotkeys';
import { createTextElement } from '../src/factory';

function createState(): HotkeyState & {
  clipboardCalls: string[];
  pasteCalls: number;
  copyCalls: string[];
  removeCalls: string[];
  updates: { id: string; props: Record<string, unknown> }[];
} {
  const el = createTextElement({ width: 960, height: 540 });
  return {
    selectedElement: { value: el },
    selectedElementId: { value: el.id },
    editingElementId: { value: '' },
    clipboard: { value: null },
    clipboardCalls: [],
    pasteCalls: 0,
    copyCalls: [],
    removeCalls: [],
    updates: [],
    setClipboard(id: string) {
      this.clipboardCalls.push(id);
      this.clipboard.value = el;
    },
    pasteElement() {
      this.pasteCalls += 1;
    },
    copyElement(id: string) {
      this.copyCalls.push(id);
    },
    removeElement(id: string) {
      this.removeCalls.push(id);
    },
    updateElement(id: string, props) {
      this.updates.push({ id, props });
    },
  };
}

function keydown(target: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
}

// 焦点在页面（body）时按键
function fire(key: string, init?: KeyboardEventInit): KeyboardEvent {
  return keydown(document.body, key, init);
}

describe('createHotkeyHandler', () => {
  let state: ReturnType<typeof createState>;
  let handler: (e: KeyboardEvent) => void;

  beforeEach(() => {
    state = createState();
    handler = createHotkeyHandler(state);
    document.addEventListener('keydown', handler);
  });

  afterEach(() => {
    document.removeEventListener('keydown', handler);
    markHotkeyScope(null);
  });

  it('Ctrl/Cmd + C 复制选中元素到剪贴板', () => {
    fire('c', { ctrlKey: true });
    expect(state.clipboardCalls).toEqual([state.selectedElement.value!.id]);
  });

  it('Ctrl/Cmd + V 粘贴并阻止默认行为', () => {
    state.clipboard.value = state.selectedElement.value;
    const e = fire('v', { ctrlKey: true });
    expect(state.pasteCalls).toBe(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it('Ctrl/Cmd + V 无剪贴板时不动作', () => {
    fire('v', { ctrlKey: true });
    expect(state.pasteCalls).toBe(0);
  });

  it('Ctrl/Cmd + D 直接克隆选中元素', () => {
    const e = fire('d', { metaKey: true });
    expect(state.copyCalls).toEqual([state.selectedElement.value!.id]);
    expect(e.defaultPrevented).toBe(true);
  });

  it('Delete / Backspace 删除选中元素', () => {
    fire('Delete');
    fire('Backspace');
    expect(state.removeCalls).toEqual([state.selectedElement.value!.id, state.selectedElement.value!.id]);
  });

  it('方向键微移 1 单位，Shift ×10', () => {
    const el = state.selectedElement.value!;
    fire('ArrowLeft');
    expect(state.updates[0].props).toEqual({ x: el.x - 1, y: el.y });
    fire('ArrowRight', { shiftKey: true });
    expect(state.updates[1].props).toEqual({ x: el.x + 10, y: el.y });
    fire('ArrowUp', { shiftKey: true });
    expect(state.updates[2].props).toEqual({ x: el.x, y: el.y - 10 });
    fire('ArrowDown');
    expect(state.updates[3].props).toEqual({ x: el.x, y: el.y + 1 });
  });

  it('Escape 先退出元素编辑态，再取消选中', () => {
    state.editingElementId.value = state.selectedElementId.value;
    fire('Escape');
    expect(state.editingElementId.value).toBe('');
    expect(state.selectedElementId.value).not.toBe('');
    fire('Escape');
    expect(state.selectedElementId.value).toBe('');
  });

  it('焦点在富文本 / 表单内不接管（系统与编辑器快捷键优先）', () => {
    const editable = document.createElement('div');
    editable.className = 'ProseMirror';
    editable.contentEditable = 'true';
    document.body.appendChild(editable);
    keydown(editable, 'c', { ctrlKey: true });
    keydown(editable, 'v', { ctrlKey: true });
    keydown(editable, 'Delete');
    keydown(editable, 'ArrowLeft');
    expect(state.clipboardCalls).toEqual([]);
    expect(state.pasteCalls).toBe(0);
    expect(state.removeCalls).toEqual([]);
    expect(state.updates).toEqual([]);
    // Escape 例外：编辑器内的 Escape 不被接管（由 ProseMirror 处理提交）
    keydown(editable, 'Escape');
    expect(state.selectedElementId.value).not.toBe('');
    editable.remove();
  });

  it('无选中元素时删除 / 微移 / 复制不动作', () => {
    state.selectedElement.value = null;
    state.selectedElementId.value = '';
    fire('Delete');
    fire('ArrowLeft');
    fire('c', { ctrlKey: true });
    expect(state.removeCalls).toEqual([]);
    expect(state.updates).toEqual([]);
    expect(state.clipboardCalls).toEqual([]);
  });

  it('多实例作用域：仅最近标记的实例接管按键', () => {
    // 另一实例标记后，本实例不接管
    markHotkeyScope({});
    fire('Delete');
    fire('c', { ctrlKey: true });
    expect(state.removeCalls).toEqual([]);
    expect(state.clipboardCalls).toEqual([]);
    // 标记回本实例（如 mousedown 落在本编辑器内）后恢复
    markHotkeyScope(state);
    fire('Delete');
    expect(state.removeCalls).toEqual([state.selectedElement.value!.id]);
  });
});
