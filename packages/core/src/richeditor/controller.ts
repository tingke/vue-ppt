/**
 * TextEditor：ProseMirror EditorView 的框架无关封装（双端共享）。
 *
 * 参考 PPTist ProsemirrorEditor.vue 的关键行为：
 * - 输入防抖 300ms 回写（onInput）
 * - 失焦/销毁前 flush，保证最后一段输入不丢失
 * - 外部内容回写前检查 hasFocus，避免打字时光标跳动
 * - 选区为空时命令自动全选（autoSelectAll）
 * - Escape 退出（由宿主决定如何结束编辑）
 */
import { EditorState, Plugin, TextSelection } from 'prosemirror-state';
import type { Command } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { parseContent, richSchema, serializeDoc } from './schema';

/** 富文本命令（工具栏 → 编辑器） */
export interface RichTextAction {
  command: 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'foreColor' | 'fontName' | 'fontSize' | 'clear';
  value?: string;
}

/** 光标处富文本状态（编辑器 → 工具栏回显） */
export interface RichTextState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  foreColor?: string;
  fontName?: string;
  fontSize?: string;
}

export interface TextEditorOptions {
  dom: Element;
  /** 初始内容（受限白名单内联 HTML，纯文本天然兼容） */
  content: string;
  editable: boolean;
  /** 画布缩放比：渲染 px → 文档单位 */
  scale: number;
  /** 输入（含命令）后的内容与高度回写，已做 300ms 防抖 */
  onInput?(text: string, height: number): void;
  onFocus?(): void;
  /** 失焦提交（携带最终内容与高度，用于宿主结束编辑） */
  onBlur?(payload: { text: string; height: number }): void;
  /** Escape 提交（同上，宿主用于结束编辑） */
  onEscape?(payload: { text: string; height: number }): void;
  /** 光标/选区处富文本状态变化（编辑中才上报） */
  onSelectionChange?(state: RichTextState): void;
}

const MIN_TEXT_HEIGHT = 24;
const INPUT_DEBOUNCE = 300;

export class TextEditor {
  private view!: EditorView;
  private options: TextEditorOptions;
  private editableState: boolean;
  private inputTimer: ReturnType<typeof setTimeout> | null = null;

  static create(options: TextEditorOptions): TextEditor {
    return new TextEditor(options);
  }

  private constructor(options: TextEditorOptions) {
    this.options = options;
    this.editableState = options.editable;

    const markCommands: Record<string, Command> = {
      'Mod-b': toggleMark(richSchema.marks.strong),
      'Mod-i': toggleMark(richSchema.marks.em),
      'Mod-u': toggleMark(richSchema.marks.underline),
      'Mod-Shift-x': toggleMark(richSchema.marks.strikethrough),
    };

    const state = EditorState.create({
      doc: parseContent(options.content),
      plugins: [
        history(),
        keymap({
          ...markCommands,
          // Escape 交由宿主结束编辑（沿用现有"Esc 提交"交互）
          Escape: () => {
            options.onEscape?.(this.commitPayload());
            return true;
          },
          // Backspace/Delete/Enter 等原生编辑键
          ...baseKeymap,
        }),
        new Plugin({
          view: () => ({
            update: (view, prevState) => {
              const changed = !view.state.doc.eq(prevState.doc) || !view.state.selection.eq(prevState.selection);
              if (!changed) return;
              // 仅编辑中上报：外部内容回写（无焦点）不触发回环
              if (view.hasFocus()) {
                this.scheduleInput();
                options.onSelectionChange?.(this.getSelectionState());
              }
            },
          }),
          props: {
            handleDOMEvents: {
              focus: () => {
                options.onFocus?.();
                return false;
              },
              blur: () => {
                options.onBlur?.(this.commitPayload());
                return false;
              },
            },
          },
        }),
      ],
    });

    this.view = new EditorView(options.dom, {
      state,
      editable: () => this.editableState,
    });
  }

  /** 外部内容回写：编辑器持有焦点时忽略，避免打字跳光标（PPTist 同款保护） */
  setContent(html: string): void {
    if (this.view.hasFocus()) return;
    const { state } = this.view;
    this.view.dispatch(state.tr.replaceWith(0, state.doc.content.size, parseContent(html).content));
  }

  setEditable(editable: boolean): void {
    this.editableState = editable;
    this.view.setProps({ editable: () => editable });
  }

  focus(): void {
    this.view.focus();
  }

  /** 选区为空时自动全选后执行命令（PPTist autoSelectAll 语义） */
  execCommand(action: RichTextAction): void {
    let { state } = this.view;
    if (state.selection.empty) {
      this.view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, 0, state.doc.content.size)));
      state = this.view.state;
    }
    const { from, to } = state.selection;
    const { dispatch } = this.view;
    const marks = richSchema.marks;

    switch (action.command) {
      case 'bold':
        toggleMark(marks.strong)(this.view.state, dispatch);
        break;
      case 'italic':
        toggleMark(marks.em)(this.view.state, dispatch);
        break;
      case 'underline':
        toggleMark(marks.underline)(this.view.state, dispatch);
        break;
      case 'strikeThrough':
        toggleMark(marks.strikethrough)(this.view.state, dispatch);
        break;
      case 'foreColor':
        if (action.value) this.view.dispatch(this.view.state.tr.addMark(from, to, marks.forecolor.create({ color: action.value })));
        break;
      case 'fontName':
        if (action.value) this.view.dispatch(this.view.state.tr.addMark(from, to, marks.fontname.create({ fontname: action.value })));
        break;
      case 'fontSize':
        if (action.value) this.view.dispatch(this.view.state.tr.addMark(from, to, marks.fontsize.create({ fontsize: action.value })));
        break;
      case 'clear':
        this.view.dispatch(this.view.state.tr.removeMark(from, to));
        break;
    }

    this.view.focus();
    this.flushInput();
    this.options.onSelectionChange?.(this.getSelectionState());
  }

  /** 光标处富文本状态（供工具栏回显） */
  getSelectionState(): RichTextState {
    const marks = this.view.state.selection.$from.marks();
    const find = (name: string) => marks.find((m) => m.type.name === name);
    return {
      bold: !!find('strong'),
      italic: !!find('em'),
      underline: !!find('underline'),
      strikeThrough: !!find('strikethrough'),
      foreColor: find('forecolor')?.attrs.color ?? undefined,
      fontName: find('fontname')?.attrs.fontname ?? undefined,
      fontSize: find('fontsize')?.attrs.fontsize ?? undefined,
    };
  }

  /** 内容是否为空（无可见文本时宿主删除元素，沿用 checkEmptyText 语义） */
  isEmpty(): boolean {
    return !this.view.state.doc.textContent.trim();
  }

  /** 当前内容 HTML（空文档输出空串） */
  getContent(): string {
    if (this.isEmpty()) return '';
    return serializeDoc(this.view.state.doc);
  }

  /** 编辑区渲染高度 → 文档单位 */
  measureHeight(): number {
    const px = (this.view.dom as HTMLElement).scrollHeight;
    return Math.max(Math.round(px / this.options.scale), MIN_TEXT_HEIGHT);
  }

  selectAll(): void {
    const { state } = this.view;
    this.view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, 0, state.doc.content.size)));
  }

  /** 立即回写挂起的输入（命令后调用） */
  flushInput(): void {
    if (this.inputTimer) {
      clearTimeout(this.inputTimer);
      this.inputTimer = null;
    }
    this.options.onInput?.(this.getContent(), this.measureHeight());
  }

  /** 提交载荷：丢弃防抖挂起的 update，直接计算最终内容与高度（blur / Escape） */
  private commitPayload(): { text: string; height: number } {
    if (this.inputTimer) {
      clearTimeout(this.inputTimer);
      this.inputTimer = null;
    }
    return { text: this.getContent(), height: this.measureHeight() };
  }

  private scheduleInput(): void {
    if (this.inputTimer) clearTimeout(this.inputTimer);
    this.inputTimer = setTimeout(() => {
      this.inputTimer = null;
      this.flushInput();
    }, INPUT_DEBOUNCE);
  }

  destroy(): void {
    this.flushInput();
    this.view.destroy();
  }
}
