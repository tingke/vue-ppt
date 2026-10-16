# @tthappy/ppt-theme

[vue-ppt](https://github.com/tingke/vue-ppt) 组件的共享样式主题：CSS 变量（`--vpk-primary` 等）+ `vpk-*` 基础类名。组件不依赖任何 UI 框架，样式全部经类名与 CSS 变量实现，可与宿主应用的组件库自由共存。

## 使用

```ts
// 任意入口引入一次即可（与 @tthappy/ppt-vue2 / ppt-vue3 搭配使用）
import '@tthappy/ppt-theme';
```

## 换肤

覆盖 CSS 变量即可：

```css
:root {
  --vpk-primary: #409eff;
}
```

## 仓库

[github.com/tingke/vue-ppt](https://github.com/tingke/vue-ppt)
