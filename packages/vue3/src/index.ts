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
