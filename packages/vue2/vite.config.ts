import { defineConfig } from 'vite';
import vue2 from '@vitejs/plugin-vue2';
import { resolve } from 'node:path';

// 与 packages/vue3 一致的 Vite lib 构建。
// 关键：产物为无内部 webpack runtime 的扁平 ESM/CJS，`vue` 作为 external
// 仅在顶层 import/require —— 避免"webpack 产物再被 webpack 消费"时
// 内部 __webpack_require__ 与宿主构建器冲突（0.1.x 在 webpack4 宿主中报
// "Cannot read properties of undefined (reading 'call')" 的根因）。
export default defineConfig({
    plugins: [vue2()],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'VuePptKitVue2',
            formats: ['es', 'cjs'],
            fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
            cssFileName: 'style'
        },
        rollupOptions: {
            // 只外部化 vue；@vue/composition-api（2.6 回落实现）/ vuedraggable /
            // ppt-core 打入包内（与 0.1.x/0.2.x 行为一致），宿主零配置
            external: ['vue'],
            output: { globals: { vue: 'Vue' } }
        }
    }
});
