import { describe, expect, it, vi } from 'vitest';
import { createEmitter, EDITOR_EMITTER, RICH_TEXT_COMMAND } from '../src/emitter';

describe('createEmitter', () => {
  it('on/emit 基本收发', () => {
    const e = createEmitter();
    const fn = vi.fn();
    e.on(RICH_TEXT_COMMAND, fn);
    e.emit(RICH_TEXT_COMMAND, { command: 'bold' });
    expect(fn).toHaveBeenCalledWith({ command: 'bold' });
  });

  it('off 注销后不再收到事件', () => {
    const e = createEmitter();
    const fn = vi.fn();
    e.on('x', fn);
    e.off('x', fn);
    e.emit('x', 1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('实例间事件隔离：a 实例的监听不收 b 实例的事件', () => {
    const a = createEmitter();
    const b = createEmitter();
    const fn = vi.fn();
    a.on('x', fn);
    b.emit('x', 1);
    expect(fn).not.toHaveBeenCalled();
    a.emit('x', 1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('emit 未监听的事件安全空操作', () => {
    const e = createEmitter();
    expect(() => e.emit('nobody', {})).not.toThrow();
  });

  it('provide/inject key 与事件名常量导出', () => {
    expect(typeof EDITOR_EMITTER).toBe('string');
    expect(RICH_TEXT_COMMAND).toBe('rich-text-command');
  });
});
