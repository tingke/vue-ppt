/**
 * @tthappy/ppt-vue3：面向 Vue 3 的 PPT 编辑器组件包。
 * 注意：组件内部不依赖 Element Plus（全部原生元素 + 自绘弹层），宿主无需安装任何 UI 库。
 *
 * 主入口为 PptEditor（工具栏 + 缩略图 + 画布的完整编辑器）；
 * SlideCanvas / SlideThumbnails / Toolbar 亦可单独引入做轻量集成。
 * 依赖 @tthappy/ppt-core 提供文档模型与算法，样式经 '@tthappy/ppt-vue3/style.css' 引入。
 */
import type { App } from 'vue';
// P1-3 单源：编辑器 / 画布 / 工具栏实现均在 packages/shared/src/components/，
// 由本端 vite 构建按端编译打入产物
import PptEditor from '@vpk/shared/components/PptEditor.vue';
import SlideCanvas from '@vpk/shared/components/SlideCanvas.vue';
import Toolbar from '@vpk/shared/components/Toolbar.vue';
import SlideThumbnails from './SlideThumbnails.vue';

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
