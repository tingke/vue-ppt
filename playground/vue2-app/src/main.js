import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import '@tthappy/ppt-theme';
// 0.2.0 起（vite lib 构建）组件样式拆分为独立 css，需显式引入
import '@tthappy/ppt-vue2/style.css';
import PptKit, { PptStage } from '@tthappy/ppt-vue2';
import App from './App.vue';
Vue.use(ElementUI);
Vue.use(PptKit);
Vue.component('PptStage', PptStage);
new Vue({ render: h => h(App) }).$mount('#app');
