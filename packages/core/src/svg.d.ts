/** 工具栏图标以 SVG 文件维护，构建时（tsup text loader）内联为字符串 */
declare module '*.svg' {
  const content: string;
  export default content;
}
