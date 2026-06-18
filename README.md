# 直播间运营管理中台 MVP

第一版实现“时间轴排班复盘模块”，使用 React + TypeScript + Vite 开发，数据保存在浏览器 `localStorage`，不依赖后端、登录或权限系统。

## 运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

## 结构

- `src/app`：应用入口和路由占位。
- `src/modules/timeline`：第一版核心时间轴模块。
- `src/modules/*/placeholder.ts`：后续问题案例库、视频模板、视频脚本、直播数据、商品链接、日报模块占位。
- `src/shared`：跨模块共享组件和后续共享能力。

## 第一版能力

- 日期、工作开始时间、标准结束时间、实际结束时间配置。
- 可拖动、可左右拉伸的当前查看范围滑块，并自动切换显示精度。
- 工作事件行和五个岗位任务行，支持重叠块分层显示。
- 点击事件/任务块快速编辑，双击空白区域新增。
- 今日实际记录、明日计划、计划与实际对照、问题记录。
- 一键填入昨日计划到今日实际。
- 当前日期 Excel 多 Sheet 导出。
