<template>
  <div class="app">
    <h1>Vue PPT Kit</h1>
    <p>Vue 2.6 + Element UI Playground — 顶部工具栏 + 左侧缩略图（含 3 种页面类型 / 业务文本）</p>
    <PptStage class="stage" :document="doc" :biz-variables="bizVariables" />
  </div>
</template>
<script>
// 业务变量树（参考需求图 2）：业务文本组件 fx 级联选择数据源
const DATE_FORMATS = ['yyyy-mm-dd', 'yyyy-m-d', 'yyyy/m/d', 'yyyy/mm/dd', 'yyyy年m月d日', 'yy-mm-dd', 'm/d', 'mm.dd', 'm.d', 'mmdd']
  .map((label) => ({ label }));

export default {
  name: 'App',
  data() {
    return {
      bizVariables: [
        {
          label: '发布详情',
          children: [
            { label: '方案名称' },
            { label: '媒体类型' },
            { label: '发布开始时间', children: DATE_FORMATS },
            { label: '发布预计开始时间', children: DATE_FORMATS },
            { label: '发布结束时间', children: DATE_FORMATS },
            { label: '发布年', children: DATE_FORMATS.slice(0, 5) },
            { label: '发布月', children: DATE_FORMATS.slice(6) },
            { label: '发布天', children: DATE_FORMATS.slice(6) },
            { label: '发布总天数' },
            { label: '发布小区数' },
            { label: '发布小区签约数' },
            { label: '发布小区实际签约数' },
            { label: '发布省' },
            { label: '发布城市' },
            { label: '发布区' },
            { label: '发布区域' },
            { label: '社区地址' },
            { label: '社区名称' },
            { label: '社区属性' },
            { label: '社区人口' },
            { label: '户数' },
            { label: '受众描述' },
            { label: '最高楼层' },
            { label: '最低楼层' },
          ],
        },
        {
          label: '社区层级',
          children: [{ label: '社区序号' }, { label: '点位序号' }],
        },
        { label: '媒体尺寸' },
        { label: '序号' },
        { label: '页码' },
      ],
      doc: {
        width: 960,
        height: 540,
        warnings: [],
        slides: [
          // 1. 自定义页（slideType 缺省即为自定义页）
          {
            id: 's1',
            elements: [
              { id: 'e1', type: 'text', x: 60, y: 60, width: 600, height: 80, text: '标题：Vue PPT Kit', fontSize: 36, color: '#303133' },
              { id: 'e2', type: 'text', x: 60, y: 160, width: 600, height: 60, text: '第 1 页 · 自定义页', fontSize: 20, color: '#606266' },
              { id: 'e3', type: 'shape', shape: 'rect', x: 60, y: 260, width: 200, height: 120, fill: '#d9ecff', stroke: '#409eff' },
              { id: 'e4', type: 'shape', shape: 'ellipse', x: 300, y: 260, width: 120, height: 120, fill: '#e1f3d8', stroke: '#67c23a' },
            ],
          },
          // 2. 特殊点位页（循环）
          {
            id: 's2',
            slideType: 'pointSpecial',
            elements: [
              { id: 'f1', type: 'text', x: 60, y: 60, width: 700, height: 60, text: '第 2 页 · 特殊点位页（循环）', fontSize: 32, color: '#303133' },
              { id: 'f2', type: 'text', x: 60, y: 160, width: 600, height: 60, text: '该页类型支持右键快捷切换', fontSize: 18, color: '#909399' },
              { id: 'f3', type: 'shape', shape: 'rect', x: 60, y: 260, width: 160, height: 120, fill: '#fde2e2', stroke: '#f56c6c' },
              { id: 'f4', type: 'shape', shape: 'rect', x: 260, y: 260, width: 160, height: 120, fill: '#fde2e2', stroke: '#f56c6c' },
              { id: 'f5', type: 'shape', shape: 'rect', x: 460, y: 260, width: 160, height: 120, fill: '#fde2e2', stroke: '#f56c6c' },
            ],
          },
          // 3. 点位页（循环）
          {
            id: 's3',
            slideType: 'point',
            elements: [
              { id: 'g1', type: 'text', x: 60, y: 60, width: 700, height: 60, text: '第 3 页 · 点位页（循环）', fontSize: 32, color: '#303133' },
              { id: 'g2', type: 'text', x: 60, y: 160, width: 600, height: 60, text: '工具栏「插入 → 新建幻灯片」可选类型', fontSize: 18, color: '#909399' },
              { id: 'g3', type: 'shape', shape: 'ellipse', x: 60, y: 260, width: 160, height: 120, fill: '#e1f3d8', stroke: '#67c23a' },
              { id: 'g4', type: 'shape', shape: 'ellipse', x: 260, y: 260, width: 160, height: 120, fill: '#e1f3d8', stroke: '#67c23a' },
              { id: 'g5', type: 'shape', shape: 'ellipse', x: 460, y: 260, width: 160, height: 120, fill: '#e1f3d8', stroke: '#67c23a' },
            ],
          },
          // 4. 自定义页
          {
            id: 's4',
            elements: [
              { id: 'h1', type: 'text', x: 60, y: 60, width: 700, height: 60, text: '第 4 页 · 自定义页', fontSize: 32, color: '#303133' },
              { id: 'h2', type: 'text', x: 60, y: 160, width: 600, height: 60, text: '类型显示在缩略图下方', fontSize: 18, color: '#909399' },
              // 业务文本：普通文字与业务字段 tag 混排（编辑态点 fx 插入变量）
              {
                id: 'h3',
                type: 'bizText',
                x: 60,
                y: 250,
                width: 640,
                height: 40,
                fontSize: 16,
                color: '#303133',
                text: '「<span data-biz-tag="发布详情/方案名称">方案名称</span>」发布时间：<span data-biz-tag="发布详情/发布开始时间/yyyy-mm-dd">发布开始时间</span> · 第<span data-biz-tag="序号">序号</span>页',
              },
            ],
          },
        ],
      },
    };
  },
};
</script>
<style>
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #303133; }
.app { max-width: 1100px; margin: 40px auto; padding: 0 24px; }
.stage { margin-top: 24px; }
</style>
