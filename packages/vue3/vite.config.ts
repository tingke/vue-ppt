import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      // P1 模型 B（共享源码 + 按端编译）：shared 单源码打入本包产物；
      // reactivity 统一出口落到 vue-api（re-export 'vue'）；
      // 端内组件出口（SlideThumbnails 分端壳）供单源 PptEditor 引用
      { find: "@vpk/shared", replacement: resolve(__dirname, "../shared/src") },
      { find: "@vpk/vue-api", replacement: resolve(__dirname, "src/vue-api.ts") },
      { find: "@vpk/shells", replacement: resolve(__dirname, "src/shells.ts") },
    ],
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "VuePptKitVue3",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
      cssFileName: "style",
    },
    rollupOptions: {
      external: ["vue", "@tthappy/ppt-core", "vuedraggable"],
      output: { globals: { vue: "Vue", vuedraggable: "vuedraggable" } },
    },
  },
});
