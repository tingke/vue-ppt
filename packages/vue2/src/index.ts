/**
 * @tthappy/ppt-vue2：面向 Vue 2.6 / 2.7 的 PPT 编辑器组件包（Element UI）。
 *
 * 主入口为 PptStage（工具栏 + 缩略图 + 画布的完整编辑器），组合式 API 经
 * src/compat.ts 运行时适配：2.7 用内置实现，2.6 用内置的
 * @vue/composition-api（自动注册，宿主零配置）；
 * SlideCanvas / SlideThumbnails / Toolbar 亦可单独引入做轻量集成。
 * 依赖 @tthappy/ppt-core 提供文档模型与算法。
 */
import Vue from 'vue';
import PptStage from './PptStage.vue';
import SlideThumbnails from './SlideThumbnails.vue';
import SlideCanvas from './SlideCanvas.vue';
import Toolbar from './Toolbar.vue';

export { PptStage, SlideThumbnails, SlideCanvas, Toolbar };
export { useSlides } from './useSlides';
export default {
  install(app: typeof Vue) {
    app.component('PptStage', PptStage as any);
    app.component('SlideThumbnails', SlideThumbnails as any);
    app.component('SlideCanvas', SlideCanvas as any);
    app.component('PptToolbar', Toolbar as any);
  }
};
