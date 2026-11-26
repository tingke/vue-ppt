import { describe, expect, it } from 'vitest';
import { INSERT_ITEM_IDS, resolveInsertItems } from '../src/presets';
import type { PptBizVariableNode } from '../src/index';

const vars: PptBizVariableNode[] = [{ label: '方案名称', value: 'name' }];
const opts: PptBizVariableNode[] = [{ label: '系统社区', children: [{ label: '拍照第1张' }] }];

describe('resolveInsertItems', () => {
  it('显式白名单非空时原样采用（业务可只保留业务组件、隐藏基础元素）', () => {
    expect(resolveInsertItems(['bizText', 'media', 'bizTable'], vars, opts)).toEqual(['bizText', 'media', 'bizTable']);
  });

  it('未配置业务数据时仅基础条目：业务按钮不出现（不配置即不使用）', () => {
    expect(resolveInsertItems()).toEqual(['slide', 'background', 'text', 'image', 'table']);
  });

  it('空数组视同未配置，走缺省推导', () => {
    expect(resolveInsertItems([], vars)).toEqual(['slide', 'background', 'bizText', 'bizTable', 'text', 'image', 'table']);
  });

  it('bizVariables 决定 bizText / bizTable，mediaOptions 决定 media', () => {
    expect(resolveInsertItems(undefined, vars)).toEqual(['slide', 'background', 'bizText', 'bizTable', 'text', 'image', 'table']);
    expect(resolveInsertItems(undefined, [], opts)).toEqual(['slide', 'background', 'media', 'text', 'image', 'table']);
    expect(resolveInsertItems(undefined, vars, opts)).toEqual([...INSERT_ITEM_IDS]);
  });
});
