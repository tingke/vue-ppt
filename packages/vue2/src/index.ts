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
