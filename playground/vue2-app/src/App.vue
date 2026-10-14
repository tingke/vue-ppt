<template>
  <div class="app">
    <h1>Vue PPT Kit</h1>
    <p>Vue 2.6 + Element UI Playground — 左侧缩略图（点击切换 / 添加 / 复制 / 删除 / 拖拽排序）</p>
    <PptStage class="stage" :document="doc" />
  </div>
</template>
<script>
export default {
  name: 'App',
  data() {
    return {
      doc: {
        width: 960,
        height: 540,
        warnings: [],
        slides: [
          {
            id: 's1',
            elements: [
              { id: 'e1', type: 'text', x: 60, y: 60, width: 600, height: 80, text: '标题：Vue PPT Kit', fontSize: 36, color: '#303133' },
              { id: 'e2', type: 'text', x: 60, y: 160, width: 600, height: 60, text: '第一页 · 示例内容', fontSize: 20, color: '#606266' },
              { id: 'e3', type: 'shape', shape: 'rect', x: 60, y: 260, width: 200, height: 120, fill: '#d9ecff', stroke: '#409eff' },
              { id: 'e4', type: 'shape', shape: 'ellipse', x: 300, y: 260, width: 120, height: 120, fill: '#e1f3d8', stroke: '#67c23a' },
            ],
          },
          {
            id: 's2',
            elements: [
              { id: 'f1', type: 'text', x: 60, y: 60, width: 600, height: 60, text: '第二页', fontSize: 32, color: '#303133' },
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
