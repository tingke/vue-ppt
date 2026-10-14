import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: { entry: resolve(__dirname, 'src/index.ts'), name: 'VuePptKitVue3', formats: ['es', 'cjs'], fileName: (format) => format === 'es' ? 'index.js' : 'index.cjs', cssFileName: 'style' },
    rollupOptions: { external: ['vue', 'element-plus', '@vue-ppt-kit/core', '@vue-ppt-kit/theme', 'vuedraggable'], output: { globals: { vue: 'Vue', 'element-plus': 'ElementPlus', vuedraggable: 'vuedraggable' } } }
  }
});
