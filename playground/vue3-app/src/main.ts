import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import '@vue-ppt-kit/theme';
import '@vue-ppt-kit/vue3/style.css';
import PptKit from '@vue-ppt-kit/vue3';
import App from './App.vue';
createApp(App).use(ElementPlus).use(PptKit).mount('#app');
