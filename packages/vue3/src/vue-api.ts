/**
 * vue3 端 reactivity 统一出口（P1-1 模型 B）：
 * shared 单源码经 '@vpk/vue-api' 导入 reactivity，与 vue2 端（alias 到 src/vue-api.ts，同名对称）一致，
 * 使两端共享同一份源码而各自按端编译。
 */
export * from 'vue';

// vue3 为 Proxy 响应式：新增 / 删除字段可直接赋值与 delete，无需 Vue.set 等价物；
// 与 vue2 端 vue-api 的 set / del（Vue.set / Vue.delete）签名对齐
export const set = (obj: Record<string, unknown>, key: string, value: unknown) => {
  obj[key] = value;
};
export const del = (obj: Record<string, unknown>, key: string) => {
  delete obj[key];
};
