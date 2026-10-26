// 端内组件出口：单源 PptEditor 经 '@vpk/shells' 引用本端组件（vite alias / tsconfig paths 按端指向）。
// SlideThumbnails 因 vuedraggable 大版本 API 差异保留分端壳（P1-3 约束 5）
export { default as SlideThumbnails } from './SlideThumbnails.vue';
