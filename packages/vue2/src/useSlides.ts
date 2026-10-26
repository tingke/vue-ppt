/**
 * 单源转发（P1-2）：实现移至 packages/shared/src/useSlides.ts（双端共享一份源码），
 * 本文件仅为保持既有导入路径（'./useSlides'）稳定而存在。
 * reactivity 由构建期 vite alias('@vpk/vue-api' → src/vue-api.ts) 落到 Vue 2 实现。
 */
export * from '@vpk/shared/useSlides';
export { default } from '@vpk/shared/useSlides';
