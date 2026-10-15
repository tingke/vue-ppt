<template>
  <main class="app">
    <h1>Vue PPT Kit</h1>
    <p>Vue 3 + Element Plus Playground — 顶部工具栏 + 左侧缩略图（含 3 种页面类型）</p>
    <PptEditor class="stage" :document="doc" />
  </main>
</template>
<script setup lang="ts">
import type { PptDocumentModel } from '@vue-ppt-kit/core';

const doc: PptDocumentModel = {
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
      ],
    },
  ],
};
</script>
<style>
body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #303133; }
.app { max-width: 1100px; margin: 40px auto; padding: 0 24px; }
.stage { margin-top: 24px; }
</style>
