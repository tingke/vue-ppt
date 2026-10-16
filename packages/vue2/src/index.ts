/**
 * @tthappy/ppt-vue2：面向 Vue 2.6 的 PPT 编辑器组件包（Element UI）。
 *
 * 主入口为 PptStage（工具栏 + 缩略图 + 画布的完整编辑器），组合式 API
 * 经 @vue/composition-api 提供（本模块入口处统一注册插件）；
 * SlideCanvas / SlideThumbnails / Toolbar 亦可单独引入做轻量集成。
 * 依赖 @tthappy/ppt-core 提供文档模型与算法。
 */
import Vue from 'vue';
import CompositionApi from '@vue/composition-api';
import PptStage from './PptStage.vue';
import SlideThumbnails from './SlideThumbnails.vue';
import SlideCanvas from './SlideCanvas.vue';
import Toolbar from './Toolbar.vue';

Vue.use(CompositionApi);

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
