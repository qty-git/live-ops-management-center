# 阶段 3：菜单与页面访问权限实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 根据当前登录用户的权限同时控制左侧菜单和页面直达访问，不改变既有时间轴业务、数据存储或云同步逻辑。

**Architecture:** 在现有权限数组中追加缺失的页面查看权限，并对阶段 2 的 users/session 权限快照做一次兼容补齐。`src/app/routes.tsx` 作为菜单与 Hash 路由的唯一配置源，`App.tsx` 在渲染页面前执行与菜单相同的权限判断。

**Tech Stack:** React 19、TypeScript、Vite 8、浏览器 Hash 路由、localStorage/sessionStorage。

---

### Task 1: 页面权限与旧数据兼容

**Files:**
- Modify: `src/modules/auth/types.ts`
- Modify: `src/modules/auth/permissions.ts`
- Modify: `src/modules/auth/userStore.ts`
- Modify: `src/modules/auth/session.ts`

- [x] 追加编辑中心、问题案例库、视频模板、视频脚本、直播数据、商品链接、复盘日报页面查看权限；保留阶段 2 的 12 个权限键。
- [x] 定义需求名称 `viewTimeline` 等到内部权限键的唯一映射。
- [x] 为旧 users/session 快照补齐所属角色的默认页面权限，已含页面权限的新快照保持原样。
- [x] 保持 member 的 `timeline:view`，确保成员仍可查看全天完整时间轴。

### Task 2: 路由与访问状态组件

**Files:**
- Modify: `src/app/routes.tsx`
- Create: `src/shared/components/AccessDenied.tsx`
- Create: `src/shared/components/ModulePlaceholder.tsx`

- [x] 将九个菜单入口集中定义为 Hash 路由元数据，关联页面权限和页面状态。
- [x] 为无权限直达提供“无权限访问”页面。
- [x] 为尚未开发的模块提供只读占位说明，不实现模块业务。

### Task 3: 菜单过滤与页面守卫

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/index.css`

- [x] 使用路由配置生成侧栏，只显示有权限的入口。
- [x] 监听 Hash 变化，支持刷新和地址栏直接访问。
- [x] 页面渲染前再次检查权限；无权限时不挂载业务页面。
- [x] 登录后无指定地址时进入第一个有权限页面，退出时恢复时间轴地址。

### Task 4: 验证与交接

**Files:**
- Modify: `PROJECT_HANDOFF.md`

- [x] 运行 `npm run lint`，预期零错误。
- [x] 运行 `npm run build`，预期构建成功，允许保留现有大包提示。
- [x] admin 验证全部菜单、时间轴/编辑中心和占位页。
- [x] member 验证只显示时间轴、仍显示全员任务、无权限 Hash 显示拦截页。
- [x] 确认时间轴本地键、CloudBase 集合和文档 ID 未修改。
- [x] 更新 `PROJECT_HANDOFF.md`，记录阶段 3 完成状态与阶段 4 边界。
