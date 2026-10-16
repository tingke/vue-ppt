/**
 * @vue-ppt/vue3：面向 Vue 3 的 PPT 编辑器组件包（Element Plus）。
 *
 * 主入口为 PptEditor（工具栏 + 缩略图 + 画布的完整编辑器）；
 * SlideCanvas / SlideThumbnails / Toolbar 亦可单独引入做轻量集成。
 * 依赖 @vue-ppt/core 提供文档模型与算法，样式经 '@vue-ppt/vue3/style.css' 引入。
 */
import type { App } from 'vue';
import PptEditor from './PptEditor.vue';
import SlideThumbnails from './SlideThumbnails.vue';
import SlideCanvas from './SlideCanvas.vue';
import Toolbar from './toolbar/index.vue';

export { PptEditor, SlideThumbnails, SlideCanvas, Toolbar };
export { useSlides } from './useSlides';
export default {
  install(app: App) {
    app.component('PptEditor', PptEditor);
    app.component('SlideThumbnails', SlideThumbnails);
    app.component('SlideCanvas', SlideCanvas);
    app.component('PptToolbar', Toolbar);
  },
};
