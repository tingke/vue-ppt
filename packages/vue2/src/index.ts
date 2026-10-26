/**
 * @tthappy/ppt-vue2：面向 Vue 2.6 / 2.7 的 PPT 编辑器组件包。
 * 注意：组件内部不依赖 Element UI（全部原生元素 + 自绘弹层），宿主无需安装任何 UI 库。
 *
 * 主入口为 PptStage（工具栏 + 缩略图 + 画布的完整编辑器；与 vue3 端 PptEditor 同一份
 * 共享实现，本端仅重命名导出），组合式 API 经 src/vue-api.ts 运行时适配：2.7 用内置实现，
 * 2.6 用内置的 @vue/composition-api（自动注册，宿主零配置）；
 * SlideCanvas / SlideThumbnails / Toolbar 亦可单独引入做轻量集成。
 * 依赖 @tthappy/ppt-core 提供文档模型与算法。
 */
import Vue from 'vue';
// P1-3 单源：编辑器 / 画布 / 工具栏实现均在 packages/shared/src/components/，
// 由本端 vite 构建按端编译打入产物（对外发布面不变）
import PptStage from '@vpk/shared/components/PptEditor.vue';
import SlideCanvas from '@vpk/shared/components/SlideCanvas.vue';
import Toolbar from '@vpk/shared/components/Toolbar.vue';
import SlideThumbnails from './SlideThumbnails.vue';

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
