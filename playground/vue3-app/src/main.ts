import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import '@tthappy/ppt-theme';
import '@tthappy/ppt-vue3/style.css';
import PptKit from '@tthappy/ppt-vue3';
import App from './App.vue';
createApp(App).use(ElementPlus).use(PptKit).mount('#app');
