# 阶段 4 + 阶段 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留全员时间轴可见和现有业务存储的前提下，实现本人任务高亮、任务字段编辑边界及本地账号权限管理。

**Architecture:** 扩展现有版本化 users/session 模型，集中提供权限映射和安全写入口；时间轴页面根据 AuthUser 与 TeamPerson 计算任务归属和编辑能力；账号管理页面复用 userStore，不接入 CloudBase。

**Tech Stack:** React 19、TypeScript、Vite、浏览器 localStorage/sessionStorage、Web Crypto API。

---

### Task 1: 扩展账号与权限模型

**Files:**
- Modify: `src/modules/auth/types.ts`
- Modify: `src/modules/auth/permissions.ts`
- Modify: `src/modules/auth/userStore.ts`
- Modify: `src/modules/auth/session.ts`
- Modify: `src/modules/auth/authService.ts`

- [ ] **Step 1:** 增加岗位、细粒度权限、users v3 和 session v4 类型。
- [ ] **Step 2:** 为旧 users/session 补齐迁移，保留全部旧数据并保证默认超级管理员存在。
- [ ] **Step 3:** 增加账号新增、资料修改、权限修改、启停、重置密码的校验写入口。
- [ ] **Step 4:** 增加会话按 userStore 刷新及禁用账号失效逻辑。
- [ ] **Step 5:** 运行 `npm run lint` 和 `npm run build`，预期均通过。

### Task 2: 实现账号与权限页面

**Files:**
- Create: `src/modules/auth/pages/UserManagementPage.tsx`
- Create: `src/modules/auth/components/UserFormModal.tsx`
- Create: `src/modules/auth/components/PermissionEditorModal.tsx`
- Create: `src/modules/auth/components/ResetPasswordModal.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/index.css`

- [ ] **Step 1:** 实现用户列表及空状态、状态和最近登录展示。
- [ ] **Step 2:** 实现新增与资料编辑表单，并按真实角色限制 super_admin。
- [ ] **Step 3:** 实现分组权限复选框，未持有 `permissions:manage` 时完全不渲染。
- [ ] **Step 4:** 实现重置密码和启停确认流程。
- [ ] **Step 5:** 将 `#/users` 的菜单与守卫改为 `users:manage` 或 `permissions:manage`。
- [ ] **Step 6:** 账号数据变化后刷新当前真实会话。

### Task 3: 实现任务归属和编辑能力

**Files:**
- Create: `src/modules/timeline/taskAccess.ts`
- Modify: `src/modules/timeline/pages/TimelinePage.tsx`
- Modify: `src/modules/timeline/components/TimelineBoard.tsx`
- Modify: `src/modules/timeline/components/TaskEditor.tsx`
- Modify: `src/modules/timeline/components/EventEditor.tsx`
- Modify: `src/modules/timeline/components/PlanTimelineBoard.tsx`
- Modify: `src/modules/timeline/components/TopControls.tsx`
- Modify: `src/modules/timeline/components/ComparisonTable.tsx`
- Modify: `src/index.css`

- [ ] **Step 1:** 实现 `resolveCurrentStaff`、`isOwnTask` 和字段级变更分类。
- [ ] **Step 2:** 将 AuthUser 传入 TimelinePage，保留全部任务数组，不做过滤。
- [ ] **Step 3:** 为本人任务卡片增加浅蓝背景、蓝色边框、“我的任务”标签和 hover 阴影。
- [ ] **Step 4:** TaskEditor 对他人任务只读，对本人仅开放反馈字段，对时间轴管理员开放结构字段。
- [ ] **Step 5:** 在 upsertTask 写入口再次拒绝越权字段，并显示“你没有权限编辑该任务”。
- [ ] **Step 6:** 没有 `timeline:manage` 时禁用事件、计划、模板覆盖和结构性操作，保留查看和范围导航。

### Task 4: 集成验证与交接

**Files:**
- Modify: `PROJECT_HANDOFF.md`

- [ ] **Step 1:** 运行 `git diff --check`，预期无空白错误。
- [ ] **Step 2:** 运行 `npm run lint`，预期通过。
- [ ] **Step 3:** 运行 `npm run build`，预期通过，允许保留既有大包提示。
- [ ] **Step 4:** 浏览器验证 admin/member 全员任务可见、本人高亮、字段边界和账号页守卫。
- [ ] **Step 5:** 浏览器验证新增、禁用、密码重置、权限编辑与 super_admin 保护。
- [ ] **Step 6:** 更新 PROJECT_HANDOFF.md，记录完成内容、测试、已知问题和阶段 6/7 交接。
