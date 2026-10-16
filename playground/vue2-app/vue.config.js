module.exports = {
  transpileDependencies: ['@tthappy'],
  configureWebpack: {
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
