/**
 * 右键菜单单源（vue2 / vue3 双端共享，P1-3）：
 * - MenuItem：菜单项结构（分隔线 / 二级菜单 / 禁用态），ContextMenu.vue 消费；
 * - useSlideContextMenu：缩略图面板右键菜单的状态与菜单项推导
 *   （打开位置、目标页 index、「新建/复制/删除/切换类型」项构建）。
 * 渲染与全局关闭监听在 ContextMenu.vue（手动挂 body，无 Teleport，2.x 兼容）。
 */
import { computed, reactive } from '@vpk/vue-api';
import type { PptDocumentModel, PptSlideTypeOption } from '@tthappy/ppt-core';

/** 菜单项：divider 为分隔线；children 为二级菜单；handler 执行后由调用方关闭菜单 */
export interface MenuItem {
  text?: string;
  subText?: string;
  disabled?: boolean;
  /** 参数为目标页 index（元素级菜单等场景可忽略） */
  handler?: (index: number) => void;
  /** 二级菜单项（如「切换类型」的类型列表） */
  children?: MenuItem[];
  divider?: boolean;
}

/** 缩略图菜单动作（由分端壳转发为本端 emit） */
export interface SlideMenuHandlers {
  create(): void;
  copy(index: number): void;
  remove(index: number): void;
  typeChange(index: number, type: string): void;
}

/** 缺省类型值：default 项优先，否则取第一项（与 PptSlideTypeOption 约定一致） */
export function defaultSlideTypeOf(slideTypes: PptSlideTypeOption[]): string | undefined {
  return (slideTypes.find((t) => t.default) || slideTypes[0])?.value;
}

export function useSlideContextMenu(doc: PptDocumentModel, handlers: SlideMenuHandlers, slideTypes: PptSlideTypeOption[] = []) {
  const menu = reactive({ visible: false, x: 0, y: 0, targetIndex: -1 });

  function openMenu(e: MouseEvent, type: 'item' | 'blank', index = -1) {
    menu.visible = true;
    menu.x = e.clientX;
    menu.y = e.clientY;
    // 注意不能写 index || -1：第一页 index 为 0 是 falsy，会被误判成空白区域
    menu.targetIndex = type === 'item' ? index : -1;
  }

  function closeMenu() {
    menu.visible = false;
  }

  const menuItems = computed<MenuItem[]>(() => {
    if (menu.targetIndex < 0) {
      // 空白区域菜单
      return [{ text: '新建页面', subText: 'Enter', handler: () => handlers.create() }];
    }
    const index = menu.targetIndex;
    const onlyOne = doc.slides.length <= 1;
    // 二级菜单：列出当前类型之外的候选（当前页未写 slideType 视为缺省类型）。
    // 候选不足 2 项（业务未配置或仅一种）时不输出「切换类型」
    const slide = doc.slides[index];
    const currentType = (slide && slide.slideType) || defaultSlideTypeOf(slideTypes);
    const typeChildren: MenuItem[] = slideTypes
      .filter((t) => t.value !== currentType)
      .map((t) => ({ text: t.label, handler: (i: number) => handlers.typeChange(i, t.value) }));
    const items: MenuItem[] = [
      { text: '新建页面', subText: 'Enter', handler: () => handlers.create() },
      { text: '复制页面', subText: 'Ctrl + D', handler: (i) => handlers.copy(i) },
      { text: '删除页面', subText: 'Delete', disabled: onlyOne, handler: (i) => handlers.remove(i) },
    ];
    if (typeChildren.length >= 1 && slideTypes.length >= 2) {
      items.push({ divider: true }, { text: '切换类型', children: typeChildren });
    }
    // 一级与二级菜单项均闭包绑定目标页 index
    return items.map((item) => ({
      ...item,
      handler: item.handler ? () => item.handler!(index) : undefined,
      children: item.children && item.children.length
        ? item.children.map((child) => ({
            ...child,
            handler: child.handler ? () => child.handler!(index) : undefined,
          }))
        : undefined,
    }));
  });

  return { menu, menuItems, openMenu, closeMenu };
}

export default useSlideContextMenu;
