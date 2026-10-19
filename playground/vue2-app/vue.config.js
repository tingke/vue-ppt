const path = require('path');

module.exports = {
  transpileDependencies: ['@tthappy'],
  // 版本组合说明：运行时 vue 固定 2.6.14（dependencies），模板编译器 vue-template-compiler
  // 用 2.7.16。原因：monorepo 里 packages/vue2 的 vite 构建依赖 vue 2.7（@vitejs/plugin-vue2
  // 需要 vue/compiler-sfc），pnpm 会把 2.7.16 提升到 .pnpm 公共层，vue-loader 从自身路径
  // 解析到的 vue 是 2.7.16，vtc 必须与其一致才能过版本检查。2.7 编译器产物在 2.6 运行时
  // 兼容已验证（jsdom 挂载 PptStage 无错误）。
  //
  // alias：packages/vue2/dist 里的 import "vue" 会从库自身 node_modules 解析到构建用
  // 的 vue 2.7.16（pnpm devDep 链接），与 playground 的 2.6.14 并存成双运行时——
  // 表现为 PptStage 渲染空白 + "provide is called when there is no active component
  // instance" 警告。这里强制全仓 vue 单一解析到 2.6.14。
  configureWebpack: {
    resolve: {
      alias: { vue$: path.resolve(__dirname, 'node_modules/vue') }
    },
    module: {
      parser: {
        // vue-loader 15 + webpack 5 的已知误报：`<style>` 块经 vue-style-loader 编译为
        // 仅含副作用（注入 DOM）的 CJS 模块、无 default 导出，而描述模块用
        // `import style0 from` 引入，触发 "export 'default' was not found" 警告。
        // 该警告挂在 module 级，ignoreWarnings 管不到，这里直接关闭导出存在性检查。
        // 样式实际正常生效；若怀疑真实缺导出，运行时表现为 undefined，可临时改回排查。
        'javascript/auto': { exportsPresence: false },
      },
    },
  },
};
