/**
 * 组合式 API 兼容层：按宿主 Vue 版本在运行时选择实现，组件统一从本模块导入。
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
import CompositionApi from '@vue/composition-api';
import * as compositionApi from '@vue/composition-api';

const [major, minor] = Vue.version.split('.').map(Number);
/** 宿主是否为内置组合式 API 的 Vue 2.7+ */
export const isVue27 = major === 2 && minor >= 7;

// 仅 Vue 2.6 需要注册插件
if (!isVue27) {
  Vue.use(CompositionApi);
}

// 两套实现接口同构，按宿主版本择一；2.7 侧取构造器属性（vue.common 产物为
// module.exports = Vue 的 default-only 形式，命名导入/命名空间导入都取不到）
const api = (isVue27 ? Vue : compositionApi) as unknown as typeof compositionApi;

export const computed = api.computed;
export const reactive = api.reactive;
export const ref = api.ref;
export const watch = api.watch;
export const provide = api.provide;
export const inject = api.inject;
export const onMounted = api.onMounted;
export const onUnmounted = api.onUnmounted;
