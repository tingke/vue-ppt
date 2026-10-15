import { ref, computed, watch, onMounted, onUnmounted, Ref } from '@vue/composition-api';

// 参考 PPTist useScaleCanvas：百分比驱动缩放，30% ~ 200%，步长 5
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

  // 参考 PPTist useViewportSize.setViewportPosition：
  // 按可视区百分比计算 viewport 尺寸/位置与 canvasScale
  function setViewportPosition() {
    const el = canvasRef.value;
    if (!el) return;
    const canvasWidth = el.clientWidth;
    const canvasHeight = el.clientHeight;
    const ratio = docHeight.value / docWidth.value;

    if (canvasHeight / canvasWidth > ratio) {
      const viewportActualWidth = canvasWidth * (canvasPercentage.value / 100);
      canvasScale.value = viewportActualWidth / docWidth.value;
      viewportLeft.value = (canvasWidth - viewportActualWidth) / 2;
      viewportTop.value = (canvasHeight - viewportActualWidth * ratio) / 2;
    } else {
      const viewportActualHeight = canvasHeight * (canvasPercentage.value / 100);
      canvasScale.value = viewportActualHeight / docHeight.value;
      viewportLeft.value = (canvasWidth - viewportActualHeight / ratio) / 2;
      viewportTop.value = (canvasHeight - viewportActualHeight) / 2;
    }
  }

  // 百分比变化时重新计算视口位置与缩放（对应 PPTist 中 store 的 watch）
  watch(canvasPercentage, () => setViewportPosition());

  function scaleCanvas(command: '+' | '-') {
    let percentage = canvasPercentage.value;
    if (command === '+' && percentage <= MAX_PERCENTAGE) percentage += STEP;
    if (command === '-' && percentage >= MIN_PERCENTAGE) percentage -= STEP;
    canvasPercentage.value = percentage;
  }

  function resetCanvas() {
    canvasPercentage.value = DEFAULT_PERCENTAGE;
  }

  function setCanvasScalePercentage(percentage: number) {
    canvasPercentage.value = Math.min(MAX_PERCENTAGE, Math.max(MIN_PERCENTAGE, percentage));
  }

  // 简易 leading throttle（避免引入 lodash 依赖）
  let lastWheelTime = 0;
  // 参考 PPTist handleMousewheelCanvas：Ctrl + 滚轮缩放画布
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
  };
}

export default useCanvasScale;
