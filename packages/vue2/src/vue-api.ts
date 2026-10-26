/**
 * 组合式 API 兼容层（与 vue3 端 src/vue-api.ts 同名对称，P1-1 模型 B）：
 * 按宿主 Vue 版本在运行时选择实现，组件统一从本模块导入。
 * - Vue 2.7+：内置实现（ref/computed/... 经 extend(Vue, vca) 挂在 Vue 构造器上，
 *   走原生 setup 路径）
 * - Vue 2.6：打包内置的 @vue/composition-api 插件，并在本模块加载时自动 Vue.use
 *   （宿主无需安装、无需注册；插件内部有防重复安装保护，宿主先行注册也不冲突）
 *
 * 关键约束：Vue 2.7 下绝不能注册插件——该插件面向 Vue 2.6，靠全局 mixin 把
 * setup() 挂进 data() 延迟调用；而 2.7 原生 initState 也会调用 setup()，两者叠加
 * 导致 setup 双重执行且互缺上下文（provide 警告、插件版 watch 内部 _watchers
 * 崩溃、setup 返回值丢失），编辑器直接渲染失败。
 */
import Vue from 'vue';
import * as vueNamespace from 'vue';
import CompositionApi from '@vue/composition-api';
import * as compositionApi from '@vue/composition-api';

const [major, minor] = Vue.version.split('.').map(Number);
/** 宿主是否为内置组合式 API 的 Vue 2.7+ */
export const isVue27 = major === 2 && minor >= 7;

// 仅 Vue 2.6 需要注册插件
if (!isVue27) {
  Vue.use(CompositionApi);
}

// 两套实现接口同构，按宿主版本与构建形态择一（2.6 走文末 vca）：
// 1. 构造器静态属性：vue.common 构建（main 字段，jest/Node 直连场景）为
//    module.exports = Vue，vca 经 extend(Vue, vca) 挂在构造器上
// 2. 命名空间命名导出：vue.runtime.esm 构建（module 字段，webpack4 优先取它）
//    构造器上没有 vca 静态属性（Vue.provide === undefined），但 ref/provide/watch
//    等是具名导出，需从 import * as 命名空间取
const vueCtor = Vue as unknown as typeof compositionApi;
const vueNs = vueNamespace as unknown as typeof compositionApi;
const api = !isVue27
  ? compositionApi
  : typeof Vue.provide === 'function'
    ? vueCtor
    : vueNs;

export const computed = api.computed;
export const reactive = api.reactive;
export const ref = api.ref;
export const watch = api.watch;
export const provide = api.provide;
export const inject = api.inject;
export const onMounted = api.onMounted;
export const onUnmounted = api.onUnmounted;
export const onBeforeUnmount = api.onBeforeUnmount;
export const nextTick = api.nextTick;
// shared 单源 SFC（P1-3，普通 setup() 写法，兼容 2.6 的 vca）经 '@vpk/vue-api' 消费
export const defineComponent = api.defineComponent;

// 类型出口（仅类型层面；devDeps 固定 vue 2.7，类型恒为 2.7 面）
export type { PropType, Ref, Component } from 'vue';

// 响应式字段增删（shared 单源经 '@vpk/vue-api' 消费）：
// Vue 2 基于defineProperty，对象上不存在的字段直接赋值 / delete 不触发更新，
// 必须走 Vue.set / Vue.delete
export const set = (obj: Record<string, unknown>, key: string, value: unknown) => {
  Vue.set(obj, key, value);
};
export const del = (obj: Record<string, unknown>, key: string) => {
  Vue.delete(obj, key);
};
