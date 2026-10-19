/**
 * 画布视口缩放与拖拽状态：
 * - 缩放：百分比驱动（30%~200%，步长 5），viewport 固定为文档实际尺寸经 transform scale 缩放，
 *   setViewportPosition 按可视区百分比计算 viewport 位置与 canvasScale，ResizeObserver 跟随容器尺寸
 * - 拖拽：按住空格进入拖拽模式（spaceKeyState），dragViewport 平移视口；缩放/重置时重新居中
 */
import { ref, computed, watch, onMounted, onUnmounted } from './compat';
import type { Ref } from 'vue';

// 百分比驱动缩放：30% ~ 200%，步长 5
const MIN_PERCENTAGE = 30;
const MAX_PERCENTAGE = 200;
const STEP = 5;
const DEFAULT_PERCENTAGE = 90;

export function useCanvasScale(
  canvasRef: Ref<HTMLElement | null>,
  docWidth: Ref<number>,
  docHeight: Ref<number>
) {
  const canvasPercentage = ref(DEFAULT_PERCENTAGE);

  const viewportLeft = ref(0);
  const viewportTop = ref(0);
  const canvasScale = ref(1);
  const canvasScalePercentage = computed(() => Math.round(canvasScale.value * 100) + '%');
  // 画布被拖拽移动过：
  // 为 true 时不做居中复位，缩放/重置时复位为 false 并重新居中
  const canvasDragged = ref(false);

  // 按可视区百分比计算视口尺寸 / 位置与 canvasScale：
  // 未拖拽过时居中；拖拽过（canvasDragged）时保持视口中心不动，避免缩放时画布跳回居中位置
  function setViewportPosition() {
    const el = canvasRef.value;
    if (!el) return;
    const canvasWidth = el.clientWidth;
    const canvasHeight = el.clientHeight;
    const ratio = docHeight.value / docWidth.value;
    const prevScale = canvasScale.value;

    let viewportActualWidth: number;
    let viewportActualHeight: number;
    if (canvasHeight / canvasWidth > ratio) {
      viewportActualWidth = canvasWidth * (canvasPercentage.value / 100);
      viewportActualHeight = viewportActualWidth * ratio;
      canvasScale.value = viewportActualWidth / docWidth.value;
    } else {
      viewportActualHeight = canvasHeight * (canvasPercentage.value / 100);
      viewportActualWidth = viewportActualHeight / ratio;
      canvasScale.value = viewportActualHeight / docHeight.value;
    }

    if (canvasDragged.value && prevScale > 0) {
      // 以旧视口中心为锚点缩放
      const centerX = viewportLeft.value + (docWidth.value * prevScale) / 2;
      const centerY = viewportTop.value + (docHeight.value * prevScale) / 2;
      viewportLeft.value = centerX - viewportActualWidth / 2;
      viewportTop.value = centerY - viewportActualHeight / 2;
    } else {
      viewportLeft.value = (canvasWidth - viewportActualWidth) / 2;
      viewportTop.value = (canvasHeight - viewportActualHeight) / 2;
    }
  }

  // 百分比变化时重新计算视口位置与缩放
  watch(canvasPercentage, () => setViewportPosition());

  // 画布拖拽状态复原时，重新居中
  watch(canvasDragged, () => {
    if (!canvasDragged.value) setViewportPosition();
  });

  function scaleCanvas(command: '+' | '-') {
    let percentage = canvasPercentage.value;
    if (command === '+' && percentage <= MAX_PERCENTAGE) percentage += STEP;
    if (command === '-' && percentage >= MIN_PERCENTAGE) percentage -= STEP;
    canvasPercentage.value = percentage;
  }

  function resetCanvas() {
    canvasPercentage.value = DEFAULT_PERCENTAGE;
    // 画布被拖拽过时同步复位：百分比可能未变化，需经 canvasDragged watch 触发居中
    if (canvasDragged.value) canvasDragged.value = false;
  }

  function setCanvasScalePercentage(percentage: number) {
    canvasPercentage.value = Math.min(MAX_PERCENTAGE, Math.max(MIN_PERCENTAGE, percentage));
  }

  // ==================== 画布拖拽（按住空格 + 鼠标拖动移动视口） ====================

  // 空格键按下状态：按住空格进入画布拖拽模式
  const spaceKeyState = ref(false);

  // 焦点在输入类元素 / 富文本编辑器内时不进入拖拽模式（正在打字空格属正常输入）
  function isEditableTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el || !el.closest) return false;
    return !!el.closest('input, textarea, select, .ProseMirror, [contenteditable="true"]');
  }

  const spaceKeydownListener = (e: KeyboardEvent) => {
    if (e.key !== ' ' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isEditableTarget(e.target)) return;
    spaceKeyState.value = true;
  };
  // keyup 无条件复位，避免焦点转移后状态卡在「按住」
  const spaceKeyupListener = () => {
    spaceKeyState.value = false;
  };

  /**
   * 拖拽画布：mousedown 起始，document 级跟踪位移，实时平移视口位置
   * （仅平移 viewportLeft/Top，不改缩放）
   */
  function dragViewport(e: MouseEvent) {
    const startPageX = e.pageX;
    const startPageY = e.pageY;
    const originLeft = viewportLeft.value;
    const originTop = viewportTop.value;

    const onMousemove = (ev: MouseEvent) => {
      viewportLeft.value = originLeft + (ev.pageX - startPageX);
      viewportTop.value = originTop + (ev.pageY - startPageY);
    };
    const onMouseup = () => {
      canvasDragged.value = true;
      document.removeEventListener('mousemove', onMousemove);
      document.removeEventListener('mouseup', onMouseup);
    };
    document.addEventListener('mousemove', onMousemove);
    document.addEventListener('mouseup', onMouseup);
  }

  // 简易 leading throttle（避免引入 lodash 依赖）
  let lastWheelTime = 0;
  // Ctrl + 滚轮缩放画布
  function handleMousewheelCanvas(e: WheelEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const now = Date.now();
    if (now - lastWheelTime < 100) return;
    lastWheelTime = now;
    if (e.deltaY > 0) scaleCanvas('-');
    else if (e.deltaY < 0) scaleCanvas('+');
  }

  // Ctrl/Cmd + = / - / 0 快捷键
  function keydownListener(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key;
    if (key === '=' || key === '+') {
      e.preventDefault();
      scaleCanvas('+');
    } else if (key === '-') {
      e.preventDefault();
      scaleCanvas('-');
    } else if (key === '0') {
      e.preventDefault();
      resetCanvas();
    }
  }

  onMounted(() => {
    setViewportPosition();
    if (canvasRef.value) {
      // Vue 2 环境兜底：ResizeObserver 不存在时监听 window resize
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => setViewportPosition());
        ro.observe(canvasRef.value);
        (canvasRef.value as any).__vpkRO = ro;
      } else {
        window.addEventListener('resize', setViewportPosition);
      }
    }
    window.addEventListener('keydown', keydownListener);
    window.addEventListener('keydown', spaceKeydownListener);
    window.addEventListener('keyup', spaceKeyupListener);
  });

  onUnmounted(() => {
    const el = canvasRef.value as any;
    if (el && el.__vpkRO) {
      el.__vpkRO.disconnect();
      delete el.__vpkRO;
    } else {
      window.removeEventListener('resize', setViewportPosition);
    }
    window.removeEventListener('keydown', keydownListener);
    window.removeEventListener('keydown', spaceKeydownListener);
    window.removeEventListener('keyup', spaceKeyupListener);
  });

  return {
    canvasPercentage,
    canvasScale,
    canvasScalePercentage,
    viewportLeft,
    viewportTop,
    setViewportPosition,
    scaleCanvas,
    resetCanvas,
    setCanvasScalePercentage,
    handleMousewheelCanvas,
    spaceKeyState,
    dragViewport,
  };
}

export default useCanvasScale;
