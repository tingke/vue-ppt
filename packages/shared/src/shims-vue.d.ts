// shared 目录的 .vue 模块垫片：仅服务于裸 tsc / 无 Volar 环境下的模块解析兜底；
// IDE（Volar）对 .vue 走真实 SFC 类型，不受本垫片影响。
// 注意不 import 'vue'：shared 目录无自身 node_modules，'vue' 需经 '@vpk/vue-api'（paths 映射到端内）解析。
declare module '*.vue' {
  const component: any;
  export default component;
}
