<template>
  <!-- 完整编辑器：工具栏 + 缩略图 + 画布（vue2 / vue3 双端共享，P1-3：普通 defineComponent + setup()；
       vue2 端入口 re-export 为 PptStage，vue3 端为 PptEditor，命名逐步归一） -->
  <!-- mousedown 标记快捷键作用域：同页多实例时仅最近交互实例接管按键 -->
  <div class="vpk-editor" @mousedown="onEditorMouseDown">
    <Toolbar :doc="state.doc" :state="state" @insert="onInsert" @save="$emit('save', state.doc)" />
    <div class="vpk-main">
      <SlideThumbnails
        :doc="state.doc"
        :slide-index="state.slideIndex"
        @select="onSelect"
        @create="state.createSlide()"
        @copy="state.copySlide($event)"
        @remove="state.deleteSlide($event)"
        @move="onThumbsMove"
        @type-change="onThumbsTypeChange"
      />
      <div
        ref="canvasRef"
        class="vpk-editor-canvas"
        @wheel="handleMousewheelCanvas"
      >
        <!-- 画布标尺：100 文档单位主刻度，随缩放自适应密度 -->
        <Ruler v-if="state.showRuler.value" :viewport-styles="rulerViewport" :canvas-scale="canvasScale" />
        <!-- viewport 固定为文档实际尺寸，通过 transform scale 缩放 -->
        <div
          class="vpk-viewport"
          :style="{
            width: state.doc.width + 'px',
            height: state.doc.height + 'px',
            left: viewportLeft + 'px',
            top: viewportTop + 'px',
            transform: 'scale(' + canvasScale + ')',
          }"
        >
          <SlideCanvas
            :slide="state.currentSlide.value"
            :width="state.doc.width"
            :height="state.doc.height"
            :scale="1"
            :canvas-scale="canvasScale"
            :selected-id="state.selectedElementId.value"
            :editing-id="state.editingElementId.value"
            @select="onSelectElement"
            @drag-move="onElementDragMove"
            @resize-move="onElementResizeMove"
            @edit-text="onEditText"
            @element-contextmenu="onElementContextMenu"
            @update-text="onUpdateText"
            @input-text="onInputText"
            @element-update="onElementUpdate"
          />

          <!-- 参考线：横竖各一条虚线，可拖动（位置存编辑器级 state，不进文档） -->
          <GuidesLayer
            v-if="state.showGuides.value"
            :width="state.doc.width"
            :height="state.doc.height"
            :canvas-scale="canvasScale"
            :x="state.guides.value.x"
            :y="state.guides.value.y"
            @update="onGuideUpdate"
          />
        </div>

        <!-- 按住空格时的拖拽遮罩：抓手光标、阻断元素交互，mousedown 触发画布拖动 -->
        <div
          v-if="spaceKeyState"
          class="vpk-drag-mask"
          @mousedown.prevent="onDragViewportMousedown"
        ></div>

        <!-- 缩放控件 -->
        <div class="vpk-zoom-tool">
          <span class="vpk-zoom-btn" title="缩小 (Ctrl + -)" @click="scaleCanvas('-')">−</span>
          <span class="vpk-zoom-text" title="点击重置 (Ctrl + 0)" @click="resetCanvas">{{ canvasScalePercentage }}</span>
          <span class="vpk-zoom-btn" title="放大 (Ctrl + +)" @click="scaleCanvas('+')">+</span>
        </div>
      </div>
    </div>

    <!-- 元素右键菜单：ContextMenu 自挂 body（双端无 Teleport，兼修 vue2 端边缘裁剪） -->
    <ContextMenu
      v-if="elMenu.visible"
      :x="elMenu.x"
      :y="elMenu.y"
      :items="elMenuItems"
      @select="onMenuSelect"
      @close="closeElMenu"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, provide, reactive, ref, watch } from '@vpk/vue-api';
import { onMounted, onUnmounted } from '@vpk/vue-api';
import type { PropType } from '@vpk/vue-api';
import {
  EDITOR_EMITTER,
  createEmitter,
  createHotkeyHandler,
  markHotkeyScope,
  createMediaTextElement,
} from '@tthappy/ppt-core';
import type { PptBizVariableNode, PptDocumentModel, PptElementModel, PptMediaElement, PptSlideType } from '@tthappy/ppt-core';
import { BIZ_VARIABLES_KEY, MEDIA_OPTIONS_KEY } from '../emitter';
import { useSlides } from '../useSlides';
import { useCanvasScale } from '../useCanvasScale';
import type { MenuItem } from '../contextMenu';
// SlideThumbnails 保留分端壳（vuedraggable 大版本差异），经 '@vpk/shells' 按端引入
import { SlideThumbnails } from '@vpk/shells';
import Toolbar from './Toolbar.vue';
import SlideCanvas from './SlideCanvas.vue';
import Ruler from './Ruler.vue';
import GuidesLayer from './GuidesLayer.vue';
import ContextMenu from './ContextMenu.vue';

export default defineComponent({
  name: 'PptEditor',
  components: { Toolbar, SlideThumbnails, SlideCanvas, Ruler, GuidesLayer, ContextMenu },
  props: {
    document: { type: Object as PropType<PptDocumentModel>, default: undefined },
    /** 业务变量树：业务文本组件 fx 级联选择数据源（编辑器级配置，不进文档数据）。
     *  runtime type 须为 Array：vue2 的 Object 校验用 isPlainObject，数组会报 type check 失败
     *  （vue3 的 isObject 对数组放行，故单源取两端皆通过的 Array + 构造签名写法） */
    bizVariables: { type: Array as unknown as () => PptBizVariableNode[], default: undefined },
    /** 媒体组件下拉选项树（编辑器级配置，不进文档数据），runtime type 同上须为 Array */
    mediaOptions: { type: Array as unknown as () => PptBizVariableNode[], default: undefined },
  },
  emits: ['save'],
  setup(props, { emit }) {
    // 编辑器实例级事件转发器：Toolbar / TextElement 等经 inject 获取，
    // 页面上多个编辑器实例时富文本命令 / 状态回显互不串扰
    provide(EDITOR_EMITTER, createEmitter());

    // 业务变量树 / 媒体选项树下发（业务文本与媒体组件 inject）。
    // props 常为异步加载（如页面 created 后请求字段元数据），provide 需给响应式
    // 数组并随 props 变化同步，否则 inject 方拿到的一直是首次的空数组。
    // 注意：不用 reactive(arr)——数组作根值在 vue2 端会告警且无法被 watch 跟踪；
    // 改用「对象持有数组」创建响应式副本，provide 的是被观察的嵌套数组
    //（引用不变，同步时只 splice 原地替换内容，inject 方始终能跟踪到更新）
    const bizVariablesHolder = reactive({ list: props.bizVariables || [] });
    const mediaOptionsHolder = reactive({ list: props.mediaOptions || [] });
    watch(
      () => props.bizVariables,
      (val) => {
        if (val === bizVariablesHolder.list) return;
        bizVariablesHolder.list.splice(0, bizVariablesHolder.list.length, ...(val || []));
      },
    );
    watch(
      () => props.mediaOptions,
      (val) => {
        if (val === mediaOptionsHolder.list) return;
        mediaOptionsHolder.list.splice(0, mediaOptionsHolder.list.length, ...(val || []));
      },
    );
    provide(BIZ_VARIABLES_KEY, bizVariablesHolder.list);
    provide(MEDIA_OPTIONS_KEY, mediaOptionsHolder.list);

    const initialDoc = props.document as PptDocumentModel | undefined;
    const state = useSlides(initialDoc ? { document: initialDoc } : undefined);

    // 模板 ref：setup 返回的 canvasRef 与 <div ref="canvasRef"> 自动绑定
    const canvasRef = ref<HTMLElement | null>(null);
    const docWidth = computed(() => state.doc.width);
    const docHeight = computed(() => state.doc.height);

    const scaleState = useCanvasScale(canvasRef, docWidth, docHeight);

    // 文档尺寸变化时重新计算视口
    watch([docWidth, docHeight], () => scaleState.setViewportPosition());

    // ==================== 标尺 / 参考线（编辑辅助 UI，状态在 useSlides） ====================

    const rulerViewport = computed(() => ({
      left: scaleState.viewportLeft.value,
      top: scaleState.viewportTop.value,
      width: docWidth.value,
      height: docHeight.value,
    }));

    // 参考线拖动回写（编辑器级 state，不进文档数据）
    function onGuideUpdate(payload: { axis: 'x' | 'y'; value: number }) {
      state.guides.value[payload.axis] = payload.value;
    }

    // 按住空格拖动遮罩：视为点击空白清除选中/编辑态，随后平移画布视口
    function onDragViewportMousedown(e: MouseEvent) {
      state.selectedElementId.value = '';
      state.editingElementId.value = '';
      scaleState.dragViewport(e);
    }

    // 切换页面时清除选中 / 编辑态
    watch(
      () => state.slideIndex.value,
      () => {
        state.selectedElementId.value = '';
        state.editingElementId.value = '';
      }
    );

    // ==================== 元素交互事件（坐标换算已在 SlideCanvas 内完成） ====================

    function onSelectElement(el: PptElementModel | null) {
      const prevId = state.selectedElementId.value;
      state.selectedElementId.value = el ? el.id : '';
      // 选中切换（含点击空白）时退出文本编辑：编辑态 blur 只回写不退出，
      // 退出编辑仅由选中切换 / 点击空白 / Escape 触发
      if (!el || el.id !== prevId) state.editingElementId.value = '';
    }

    function onElementDragMove(payload: { id: string; x: number; y: number }) {
      // 'drag' tag：同一手势内的高频 move 合并为一步历史（媒体 + 关联文本同手势同步移动）
      state.updateElement(payload.id, { x: payload.x, y: payload.y }, { historyTag: 'drag' });
    }

    function onElementResizeMove(payload: { id: string; x: number; y: number; width: number; height: number }) {
      state.updateElement(payload.id, payload, { historyTag: 'drag' });
    }

    function onEditText(el: PptElementModel) {
      state.selectedElementId.value = el.id;
      state.editingElementId.value = el.id;
    }

    function onUpdateText(payload: { id: string; text: string; height: number }) {
      if (!payload.text.trim()) {
        // 空文本：删除元素
        state.removeElement(payload.id);
      } else {
        state.updateElement(payload.id, { text: payload.text, height: payload.height }, { historyTag: 'type' });
      }
      state.editingElementId.value = '';
    }

    // 编辑过程中实时写回内容与高度，保证画布显示与输入同步。
    // 'type' tag：连续输入合并为一步历史；blur / escape 提交与最后一次 input
    // 内容一致时经历史去重不产生新步骤
    function onInputText(payload: { id: string; text: string; height: number }) {
      state.updateElement(payload.id, { text: payload.text, height: payload.height }, { historyTag: 'type' });
    }

    // ==================== 通用元素属性更新（媒体组件选照片等） ====================

    function onElementUpdate(payload: { id: string; patch: Partial<PptElementModel> }) {
      state.updateElement(payload.id, payload.patch);
    }

    // ==================== 插入元素（媒体组件成对创建关联业务文本） ====================

    function onInsert(element: PptElementModel) {
      if (element.type === 'media') {
        // 媒体 + 关联业务文本（独立 bizText，位于媒体正下方）：拖动媒体时文本跟随
        const text = createMediaTextElement(element);
        (element as PptMediaElement).textId = text.id;
        state.addElement(element);
        state.addElement(text);
        // 选中态落在媒体上（而非后插入的关联文本）
        state.selectedElementId.value = element.id;
        return;
      }
      state.addElement(element);
    }

    // ==================== 缩略图事件（多参事件经方法展开，避免模板内箭头函数的双端差异） ====================

    function onSelect(index: number) {
      state.slideIndex.value = index;
    }
    function onThumbsMove(from: number, to: number) {
      state.moveSlide(from, to);
    }
    function onThumbsTypeChange(index: number, type: PptSlideType) {
      state.setSlideType(index, type);
    }

    // ==================== 元素右键菜单 ====================

    const elMenu = reactive({ visible: false, x: 0, y: 0, element: null as PptElementModel | null });

    const elMenuItems = computed<MenuItem[]>(() => {
      const el = elMenu.element;
      if (!el) return [];
      const items: MenuItem[] = [
        { text: '复制', subText: 'Ctrl + C', handler: () => state.copyElement(el.id) },
      ];
      // 媒体组件：隐藏/显示关联的业务文本（独立元素置 hidden，可再显示）
      if (el.type === 'media') {
        const textId = (el as PptMediaElement).textId;
        const linked = textId
          ? (state.doc.slides[state.slideIndex.value]?.elements || []).find((e) => e.id === textId)
          : null;
        items.push(
          { divider: true },
          {
            text: linked && linked.hidden ? '显示输入框' : '隐藏输入框',
            disabled: !linked,
            handler: () => {
              if (!textId || !linked) return;
              state.updateElement(textId, { hidden: !linked.hidden } as Partial<PptElementModel>);
            },
          },
        );
      }
      items.push(
        { divider: true },
        { text: '水平居中', handler: () => state.alignElementToCanvas(el.id, 'horizontal') },
        { text: '垂直居中', handler: () => state.alignElementToCanvas(el.id, 'vertical') },
        { divider: true },
        { text: '置于顶层', handler: () => state.orderElement(el.id, 'top') },
        { text: '上移一层', handler: () => state.orderElement(el.id, 'up') },
        { text: '下移一层', handler: () => state.orderElement(el.id, 'down') },
        { text: '置于底层', handler: () => state.orderElement(el.id, 'bottom') },
        { divider: true },
        { text: '删除', subText: 'Delete', handler: () => state.removeElement(el.id) },
      );
      return items;
    });

    function onElementContextMenu(payload: { element: PptElementModel; x: number; y: number }) {
      elMenu.visible = true;
      elMenu.x = payload.x;
      elMenu.y = payload.y;
      elMenu.element = payload.element;
    }

    // 菜单项点击：执行闭包绑定的业务动作并关闭菜单
    function onMenuSelect(item: MenuItem) {
      if (item.handler) item.handler(-1);
      closeElMenu();
    }

    function closeElMenu() {
      elMenu.visible = false;
    }

    // 菜单目标元素被删除（如快捷键 Delete/Backspace，走 state.removeElement 不经过菜单）时关闭菜单，
    // 避免悬空菜单仍展示已删除元素的操作项
    const menuElementExists = computed(() => {
      if (!elMenu.visible || !elMenu.element) return true;
      const elements = state.doc.slides[state.slideIndex.value]?.elements || [];
      return elements.some((e) => e.id === elMenu.element!.id);
    });
    watch(menuElementExists, (exists) => {
      if (!exists) closeElMenu();
    });

    // 全局快捷键（元素级编辑：复制/粘贴/克隆/删除/微移/Escape）
    const hotkeyHandler = createHotkeyHandler(state);

    // 编辑器根节点 mousedown：标记本实例为快捷键作用域（同页多实例互不干扰）
    function onEditorMouseDown() {
      markHotkeyScope(state);
    }

    onMounted(() => {
      document.addEventListener('keydown', hotkeyHandler);
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', hotkeyHandler);
    });

    return {
      state,
      canvasRef,
      rulerViewport,
      onGuideUpdate,
      onEditorMouseDown,
      onDragViewportMousedown,
      onSelect,
      onThumbsMove,
      onThumbsTypeChange,
      onSelectElement,
      onElementDragMove,
      onElementResizeMove,
      onEditText,
      onUpdateText,
      onInputText,
      onElementUpdate,
      onInsert,
      elMenu,
      elMenuItems,
      onElementContextMenu,
      onMenuSelect,
      closeElMenu,
      ...scaleState,
    };
  },
});
</script>

<style scoped>
.vpk-editor {
  display: flex;
  flex-direction: column;
  height: 560px;
  min-height: 320px;
  background: var(--vpk-stage-bg, #f5f7fa);
  border: 1px solid var(--vpk-border, #ebeef5);
  box-sizing: border-box;
  overflow: hidden;
}
.vpk-main {
  display: flex;
  flex: 1;
  min-height: 0;
}
.vpk-editor-canvas {
  position: relative;
  flex: 1;
  overflow: hidden;
}
.vpk-viewport {
  position: absolute;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transform-origin: 0 0;
}
/* 画布拖拽遮罩：覆盖整个画布区域，DOM 顺序在 viewport 之后、缩放控件之前 */
.vpk-drag-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  cursor: grab;
  user-select: none;
}
.vpk-zoom-tool {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  padding: 0 4px;
  background: #fff;
  border: 1px solid var(--vpk-border, #e4e7ed);
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  user-select: none;
}
.vpk-zoom-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  border-radius: 3px;
  color: #606266;
}
.vpk-zoom-btn:hover {
  background: #f5f7fa;
  color: var(--vpk-primary, #409eff);
}
.vpk-zoom-text {
  min-width: 46px;
  text-align: center;
  font-size: 12px;
  cursor: pointer;
  color: #303133;
}
</style>
