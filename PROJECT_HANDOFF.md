# 直播运营管理中台项目交接

最后更新：2026-06-20
当前分支：`codex/style-split`
阶段状态：阶段 1–8 稳定版本与 CSS 搬家式拆分均已提交并推送

## 1. 项目目标

把现有直播运营时间轴升级为多人团队协作后台。在保留时间轴、模板、次日计划、问题记录、Excel 导出、本地保存和 CloudBase 同步的基础上，分阶段加入登录、账号、角色权限、任务归属高亮、账号管理、管理员视角切换和关键操作权限边界。

## 2. 当前版本状态

- 技术栈：React 19、TypeScript、Vite 8、CloudBase JS SDK。
- 稳定线上分支：`main`，本轮未修改、未合并、未部署。
- 阶段 1–8 稳定分支：`codex/ui-date-issue-edits`，提交 `db04b72` 已推送远端。
- 当前开发分支：`codex/style-split`，从 `db04b72` 创建。
- CSS 拆分提交：`26d6397 refactor: split stylesheet into ordered modules`，已推送 `origin/codex/style-split`，未部署。
- 时间轴业务数据继续使用 `live-ops-management.timeline.v1`，CloudBase 仍同步 `timeline_stores/main`。
- users 仍使用独立键 `live-ops-management.users.v1`，内部结构升级为 v3；session 使用原独立键，内部结构升级为 v4。
- 阶段 4/5 未修改时间轴数据结构、业务存储键、CloudBase 集合、文档 ID、匿名登录或同步时序。
- 阶段 6/7 同样未修改 users/session 版本、时间轴数据结构或 CloudBase 同步逻辑；成员视角只保存在 App 内存状态，刷新页面自动退出。
- 阶段 8 只优化现有 UI、交互提示与阶段 1–7 引入的明显体验问题，未新增业务模块，也未修改 CloudBase、认证、权限、数据迁移或时间轴计算核心逻辑。

## 3. 当前文件结构

```text
src/
  app/
    App.tsx                         登录拦截、菜单过滤、Hash 路由、页面守卫与会话刷新
    routes.tsx                      菜单、Hash 地址和页面权限配置
  modules/
    auth/
      accessControl.ts             realUser / viewUser / effectiveUser 与集中权限工具
      authService.ts               登录认证与 SHA-256 密码哈希
      permissions.ts               默认权限、页面映射和权限分组
      session.ts                   session v4、旧会话迁移与 users 重校验
      types.ts                     users、岗位、角色、权限和会话类型
      userStore.ts                 users v3、迁移、安全写入口与超级管理员保护
      components/
        LoginPage.tsx
        PerspectiveSwitcher.tsx   管理员成员视角选择器
        UserFormModal.tsx
        PermissionEditorModal.tsx
        ResetPasswordModal.tsx
      pages/UserManagementPage.tsx 账号与权限管理页
    timeline/
      taskAccess.ts                 本人任务判断、字段能力和保存入口过滤
      pages/TimelinePage.tsx        时间轴权限能力编排
      components/                   时间轴卡片、任务详情和只读控制
  shared/components/
    AccessDenied.tsx
    ModulePlaceholder.tsx
  index.css                         登录、路由、任务高亮和账号页样式
```

## 4. 已完成功能

### 原有功能

- 时间轴工作台、日期选择、查看范围拖动和缩放。
- 今日事件与岗位任务、次日计划、计划实际对照、问题记录。
- 岗位人员、大事件模板、整日计划模板编辑。
- Excel 导出、本地保存和 CloudBase 云端同步。

### 阶段 1：登录

- 登录页、默认 `admin` 超级管理员、登录状态、未登录拦截和退出登录。
- 记住登录状态使用 localStorage，否则使用 sessionStorage。
- 密码只保存 SHA-256 哈希，不保存默认密码明文。

### 阶段 2：用户和角色权限

- 独立 users 仓库、`member / manager / admin / super_admin`、账号状态、权限快照和人员绑定。
- 默认角色权限及 users/session 版本迁移基础。

### 阶段 3：菜单和页面权限

- 左侧菜单按权限过滤，Hash 页面路由和页面进入二次守卫。
- 无权限页、未开发模块占位页、users v1 → v2 和 session v1/v2 → v3 迁移。
- member 保持查看全员全天计划，不按用户过滤任务。

### 阶段 4：时间轴查看与我的任务高亮

- 所有具有时间轴查看权限的登录用户继续接收完整 `day.tasks`，不隐藏其他人的任务。
- 本人任务按绑定人员姓名、账号岗位、可选 `assignedUserId` 顺序匹配，适配现有 `personId + personName + role` 数据。
- 本人任务使用浅蓝背景、蓝色边框、“我的任务”标签和增强 hover 阴影。
- 普通成员可打开全部任务详情；他人任务全部只读。
- 普通成员本人任务只开放完成状态、问题/方案和备注；时间、岗位、负责人、工作内容、关联事件和删除均不可用。
- 任务保存入口使用 `restrictTaskUpdate()` 二次过滤，不能只靠 disabled/readOnly 控件绕过。
- 无结构编辑权限时禁止新增/删除任务、编辑事件、修改次日计划和覆盖整日计划；日期切换和时间范围缩放保留。
- 时间轴设置、昨日计划填入、对照备注和 Excel 导出分别按相关权限控制。

### 阶段 5：账号与权限管理

- 新增可用的 `#/users` 账号与权限页面，不再是占位页。
- 页面入口和直达守卫接受 `users:manage` 或 `permissions:manage`；member 默认不显示且直达显示“无权限访问”。
- 用户列表显示姓名、账号、手机号、角色、岗位、绑定人员、状态、最近登录和操作。
- 支持新增账号、编辑资料、权限编辑、重置密码、启用和禁用账号。
- 岗位支持主播、中控、场控、摄影、运营、管理；绑定人员读取现有 TeamPerson。
- 权限按基础查看、工作编辑、模板、内容、数据与导出、系统管理分组展示。
- 没有 `permissions:manage` 的管理员看不到权限复选框和权限编辑操作。
- 普通 admin 不能创建、编辑、禁用、重置密码或修改 super_admin；userStore 写入口和 UI 均校验。
- 禁用账号不能再次登录；users 变化后当前真实会话会从 userStore 刷新。
- 重置密码继续使用现有哈希方案，新密码可用于登录。
- users v1/v2 → v3、session v1/v2/v3 → v4 兼容迁移不会清空有效旧账号数据，并按角色补齐新增权限。

### 阶段 6：管理员切换成员视角

- 真实身份为 admin / super_admin 且拥有 `perspective:switch` 时，左侧账号区显示“切换视角”。
- 可切换列表来自现有 users，仅展示已启用的 member / manager，不修改账号数据。
- App 明确区分 `realUser`、`viewUser` 和 `effectiveUser`；普通菜单、页面守卫、时间轴高亮和业务按钮使用 effectiveUser。
- 账号与权限入口、账号写操作、super_admin 保护继续始终使用 realUser；切换到 member 视角不会覆盖真实登录会话。
- 进入视角后工作区顶部显示“当前正在以 XXX 视角查看”，左侧选择器和顶部提示均可退出视角。
- 如果当前业务页面不属于目标成员权限，切换时自动回到其首个可访问页面；刷新页面也会安全退出临时视角。
- 普通成员、主管以及没有 `perspective:switch` 的账号既看不到入口，也无法调用切换处理函数。

### 阶段 7：关键操作权限校验

- 新增集中权限工具：真实权限、有效权限、权限要求、视角资格和目标账号保护判断。
- 时间轴结构写入、事件、次日计划、昨日计划填入、对照备注、模板应用和自动填入昨日计划均在执行函数前校验 `timeline:manage`。
- 任务保存继续使用 `getTaskEditAccess()` + `restrictTaskUpdate()`：member 可查看全员任务，但本人仅能写反馈、备注和完成状态；他人任务与结构字段无法绕过 UI 写入。
- 编辑中心分别按 `people:manage`、`event_templates:edit`、`day_plan_templates:edit` 禁用编辑控件，并在父级保存入口再次校验。
- 无大事件模板编辑权限时，编辑中心原有的模板自动补齐 effect 不再写入模板。
- 新增、修改和删除两类模板均受对应模板权限保护；覆盖计划和应用模板受 `timeline:manage` 保护。
- 账号页面固定接收 realUser；页面处理函数和 userStore 写入口双层校验 `users:manage` / `permissions:manage`，并复用集中 super_admin 目标保护。
- Excel 按钮在无 `exports:use` 时不显示；页面导出处理函数和 `exportTimelineExcel()` 底层函数均会阻止无权限调用。
- 当前项目没有“清空全部业务数据”入口，本轮未新增危险操作；未来如新增必须使用 realUser 的 `data:delete`、二次确认，并保持普通 admin 默认无该权限。

### 阶段 8：整体 UI 优化与 Bug 修复

- 登录页卡片、输入焦点、错误提示、禁用的手机号入口和默认管理员提醒统一为更清晰的 SaaS 后台视觉；输入内容变化时会清理旧错误提示。
- 左侧用户区同时展示姓名、登录账号和角色，退出按钮、菜单滚动空间及视角切换入口重新整理，权限菜单隐藏后仍保持稳定布局。
- 管理员成员视角提示改为浅蓝提示条，统一“当前正在以【成员】视角查看”文案；视角选择器支持点击外部和 Esc 关闭，并继续提供明确退出入口。
- 账号与权限页新增账号统计摘要、用户头像、角色标签和禁用行状态；编辑、权限、重置、启用/禁用操作统一为紧凑按钮，并强化 super_admin 受保护提示。
- 权限编辑弹窗增加独立权限说明、已选权限总数和各分组已选数量，复选项的选中和 hover 状态更易读。
- 通用弹窗优化圆角、遮罩、页脚及表单间距，并支持 Esc 关闭；账号页成功和错误通知支持手动关闭。
- 无权限页调整为非技术化说明，并提供“返回首页”按钮。
- “我的任务”高亮改为浅蓝背景、左侧蓝色强调线和柔和阴影，标签统一但不会压低其他人任务的可读性。
- 时间轴越权操作提示统一使用现有页面通知样式，任务类拦截文案统一为“你没有权限执行此操作”，未引入新的通知依赖。

## 5. 角色默认权限摘要

- `member`：查看全员时间轴、高亮本人任务、编辑本人任务反馈。
- `manager`：member 权限 + 时间轴/全部任务/人员/模板/问题/内容管理和导出。
- `admin`：manager 权限 + 查看和管理账号 + 成员视角权限；默认没有分配权限能力。
- `super_admin`：全部权限，包括分配权限和删除数据权限键。

角色只决定新账号和迁移时的默认权限；每个用户仍保存独立权限快照。

## 6. 当前未提交改动

阶段 1 至 8 所有改动仍在工作区，包括：

- `src/app/App.tsx`
- `src/app/routes.tsx`
- `src/index.css`
- `src/modules/auth/**`
- `src/modules/auth/accessControl.ts`
- `src/modules/auth/components/PerspectiveSwitcher.tsx`
- `src/modules/timeline/taskAccess.ts`
- `src/modules/timeline/pages/TimelinePage.tsx`
- `src/modules/timeline/components/TimelineBoard.tsx`
- `src/modules/timeline/components/TaskEditor.tsx`
- `src/modules/timeline/components/PlanTimelineBoard.tsx`
- `src/modules/timeline/components/TopControls.tsx`
- `src/modules/timeline/components/ComparisonTable.tsx`
- `src/modules/timeline/components/EditCenterPanel.tsx`
- `src/modules/timeline/components/TimeInput.tsx`
- `src/modules/timeline/exportExcel.ts`
- `src/shared/components/AccessDenied.tsx`
- `src/shared/components/ModulePlaceholder.tsx`
- `src/shared/components/Modal.tsx`
- `docs/superpowers/specs/2026-06-20-stage-4-5-design.md`
- `docs/superpowers/plans/2026-06-20-stage-3-access-control.md`
- `docs/superpowers/plans/2026-06-20-stage-4-5-timeline-users.md`
- `PROJECT_HANDOFF.md`

## 7. 关键逻辑说明

- `App.tsx` 启动时初始化 users，再加载并重校验会话；禁用或不存在的账号不会恢复会话。
- `App.tsx` 将 session.user 固定为 realUser，临时 viewUser 只来自当前 userStore；effectiveUser 用于普通业务页面，账号页例外使用 realUser。
- `accessControl.ts` 是视角身份语义、通用权限要求、成员视角资格和账号目标保护的集中来源。
- `routes.tsx` 仍是菜单和页面地址唯一配置源；账号页使用 OR 权限数组。
- `permissions.ts` 是角色默认权限和权限分组唯一来源。
- `userStore.ts` 是账号写操作安全边界；页面隐藏按钮之外，写入口仍拒绝越权和 super_admin 操作。
- `taskAccess.ts` 是任务归属、字段能力和保存过滤唯一来源。
- `TimelinePage` 是时间轴、计划、模板应用和导出操作的执行前权限边界；编辑中心回调还会在进入 store 更新前二次校验。
- `TimelinePage` 不过滤任务，只向时间轴传入高亮判断和编辑能力。
- users 不进入时间轴业务存储，也不参与 CloudBase 同步。
- 退出登录只清除认证会话，不清除 users 或时间轴数据。

## 8. 阶段 4–7 验证记录

- `git diff --check`：通过。
- `npm run lint`：通过。
- `npm run build`：通过；仅保留原有主包超过 500 kB 的性能提示。
- 默认超级管理员登录成功，显示全部菜单及账号与权限页面。
- 新增普通成员成功，绑定“运营 A”并使用初始密码登录成功。
- 重置成员密码后旧测试密码不再使用，新密码登录成功。
- member 同时看到“运营 A”和“主播 A”任务，没有只显示本人任务。
- member 的运营任务显示“我的任务”，主播任务正常显示。
- member 本人任务结构字段只读，完成状态和备注可编辑；他人任务所有编辑控件禁用且无删除按钮。
- member 直达 `#/users` 显示“无权限访问”。
- 权限分组复选框保存成功，菜单按新权限即时刷新。
- 禁用成员后该账号登录显示“当前账号已被禁用，请联系管理员”。
- 普通 admin 可看到账号管理页但没有任何权限编辑按钮；super_admin 行显示“受保护账号”。
- 浏览器控制台未发现应用运行错误。
- `npm run lint`：首次检查发现本轮新增的 App effect 同步 setState 问题；移除该 effect、改为在账号刷新事件中清理视角后，最终检查通过。
- `npm run build`：通过；仅保留原有主包超过 500 kB 的性能提示。

## 9. 阶段 8 验证记录

- `npm run lint`：通过。
- `npm run build`：通过；仅保留原有主包超过 500 kB 的性能提示。
- Vite 开发服务器可正常启动；2026-06-20 已完成登录、角色权限、视角切换、账号保护、member 任务边界和 1280px 页面布局的浏览器验收。
- 未提交、未推送、未部署；未修改 CloudBase 同步逻辑、users/session 数据版本、时间轴核心数据结构或权限核心边界。

## 10. 已知问题

- 当前仍是纯前端本地账号系统，不能替代服务端鉴权；users 和权限不会跨浏览器、跨设备共享。
- SHA-256 未加盐，仅适合当前开发阶段；正式多人使用应迁移到 CloudBase 身份认证或云函数强密码哈希。
- 禁用和重置密码无法撤销其他设备上已存在的离线会话，因为当前没有服务端会话中心。
- 按需求保留“岗位相同也算本人任务”的兜底，因此同岗位多人且没有准确人员绑定时可能高亮同岗位多条任务；优先配置绑定人员可提高准确性。
- 成员视角为当前标签页内的临时状态，刷新页面后会退出视角，这是为了避免污染真实认证 session。
- 当前没有清空全部业务数据或删除账号功能，因此 `data:delete` 和“删除 super_admin 账号”的规则暂时没有对应 UI；现有任务、事件、计划及模板删除已按各自业务权限保护。
- Vite 构建仍提示主包超过 500 kB，不影响功能。
- 内置浏览器不支持文件下载，Excel 实际文件落盘未能在该浏览器完成；已确认按钮权限、页面导出函数和 `exportTimelineExcel()` 底层权限断言。
- 账号启停按钮会正常弹出原生二次确认；内置浏览器在该原生确认框后失去控制，未能完成同一次自动化中的“确认启用”收尾。禁用账号登录拦截、UI 入口、二次确认和 `setUserStatus()` 写入口均已验证。
- 测试环境无法连接 CloudBase，页面正确回退为“云端未连接，继续使用本地数据”；本轮按边界要求未修改、未重构 CloudBase 同步逻辑。

## 11. 下一阶段建议

当前代码已完成阶段 1–8 测试收口，建议在用户确认后进入稳定版本提交。提交前仍需再次运行 `git status`、lint、build 和 `git diff --check`；提交、推送和部署继续分步等待用户明确确认。

最终测试或修复期间继续保持：不修改 CloudBase 同步协议，不清空 users、session 或时间轴数据，不破坏 realUser / viewUser / effectiveUser 边界，也不移除关键操作的函数级权限校验。

## 12. 新对话交接说明

```markdown
当前分支：codex/style-split

阶段 1–8 稳定提交 db04b72 已推送。CSS 已按原顺序拆分为 10 个模块，字节一致性、lint、build、git diff check 和 1280px 视觉冒烟均通过。请先阅读 PROJECT_HANDOFF.md 并检查 git status。

下一轮只执行：
- 确认 CSS 拆分提交状态与工作区清洁度
- 从 CSS 拆分提交创建 `codex/account-table-ux`
- 只处理账号表格横向滚动、操作分组和状态展示
- 权限抽屉和整体 UI 高级化继续使用后续独立分支
- 推送和部署继续等待单独确认

重要约束：
- 保留 realUser / viewUser / effectiveUser 区分。
- 账号与权限入口、super_admin 保护和 data:delete 始终使用 realUser。
- member 继续查看全员全天计划。
- 不清空 users 或时间轴数据。
- 不修改 CloudBase 同步逻辑，不重写 auth / permissions / users 结构。
- 不移除函数级权限校验，不删除现有页面。
- 未经用户明确确认，不要提交、推送或部署。

开始前先检查 git status；未经用户确认不要提交、推送或部署。
```

## 13. 阶段 1–8 全量测试收口（2026-06-20）

### 13.1 测试环境

- 分支：`codex/ui-date-issue-edits`。
- 本地服务：Vite `http://127.0.0.1:5177/`。
- 浏览器视口：1280 × 720。
- 测试账号：默认 `admin`、独立 member、manager、普通 admin 和禁用 member。
- 测试账号仅写入本次本地浏览器测试源；未清空 users、session 或时间轴数据。
- CloudBase 在测试环境未连接，应用按既有逻辑继续使用本地数据。

### 13.2 测试结果

- 基础启动：通过。页面正常打开，未登录时显示登录页，登录错误提示清楚，退出后直达后台仍被登录页拦截。
- 登录与 session：通过。admin、member、manager 登录成功；禁用账号登录被拒绝；刷新后登录状态保持；密码重置后旧密码失效、新密码生效。
- 菜单与页面守卫：通过。admin 显示完整菜单；manager 显示业务菜单但无账号入口；member 仅显示时间轴；member 直达 `#/users` 和 `#/edit-center` 均显示友好的“无权限访问”。
- 时间轴查看：通过。缩小查看范围后 member 同时看到主播、中控、场控和运营任务，没有按本人过滤；本人运营任务显示柔和浅蓝“我的任务”高亮，其他任务保持正常可读。
- member 编辑边界：通过。他人任务完整只读、无删除按钮；本人任务的内容、岗位、人员、时间和关联事件只读，仅完成状态、问题反馈和备注可写；实际保存并重新打开后，完成状态和备注均正确保留。
- 函数级任务保护：通过源码核验。`upsertTask()` 使用 `getTaskEditAccess()` 和 `restrictTaskUpdate()` 二次过滤，`deleteTask()` 再次校验删除能力。
- 管理员成员视角：通过。admin/super_admin 可切换 member；菜单按 effectiveUser 收缩，同时账号入口仍按 realUser 保留；页面显示浅蓝视角提示；时间轴高亮目标 member；退出后恢复管理员菜单和身份。
- 普通成员视角入口：通过。member 看不到入口，也无法通过页面路径获得该能力。
- 账号与权限：通过。账号列表、新增账号、权限弹窗、权限保存和密码重置正常；权限分组与计数可读；1280px 下页面不发生整体横向溢出，表格容器保留横向滚动（容器 936px，表格 1220px）。
- `super_admin` 保护：通过。普通 admin 的超级管理员行只显示“超级管理员受保护”，没有编辑、权限、重置或禁用按钮；普通 admin 的角色下拉不包含 `super_admin`；userStore 写入口仍有二次保护。
- 编辑中心权限：通过源码与角色入口核验。无 `edit_center:view` 时页面守卫拒绝进入；人员、事件模板和整日模板控件分别按三类权限禁用；组件操作函数及 `TimelinePage` 保存回调均再次校验权限。
- 导出权限：通过 UI 与源码核验。member 不显示导出按钮；页面函数先校验 `exports:use`，底层 `exportTimelineExcel()` 再执行 `assertPermission()`。内置浏览器不支持下载，因此未验证文件实际落盘。
- 删除权限：通过。member 没有任务删除入口，`deleteTask()` 再次校验；事件、任务、计划和模板删除使用对应业务权限与确认提示。项目仍不存在清空全部业务数据入口，普通 admin 默认没有 `data:delete`。
- UI 收口：通过。登录页、无权限页、浅蓝视角提示、任务高亮、权限弹窗及账号页未发现明显遮挡、重叠或页面级横向溢出。
- 浏览器控制台：未发现应用运行错误；只出现测试宿主自身的 Statsig 网络上报失败，与项目代码无关。

### 13.3 本轮发现与处理

- 未发现需要修改业务代码的明确 P0/P1 问题，因此没有扩大 UI、权限或时间轴逻辑改动。
- 新建本地测试账号并设置一条带“权限测试”标记的本地任务，用于跨角色验证全员可见、本人高亮和字段级保存；这些内容不属于 Git 工作区改动。
- 账号启用操作已显示二次确认，但内置浏览器在原生确认框后失去控制；这是测试工具限制，未观察到应用异常，相关 UI 和函数写入口已通过源码核验。
- Excel 点击下载受内置浏览器能力限制，改用按钮可见性、页面处理函数和底层权限断言三层核验。

### 13.4 本轮修改文件

- `PROJECT_HANDOFF.md`：补充阶段 1–8 全量测试、限制、验证结果和后续计划。
- 本轮未修改任何业务源码或样式文件。

### 13.5 最终验证

- `npm run lint`：通过。
- `npm run build`：通过；仅保留主包超过 500 kB 的既有提示。
- `git diff --check`：通过。

### 13.6 是否建议提交

稳定版本已提交为 `db04b72` 并推送至 `origin/codex/ui-date-issue-edits`。

### 13.7 后续独立分支计划

1. `codex/style-split`：仅搬家式拆分 CSS，不改变视觉或 class 名。
2. `codex/account-table-ux`：优化账号表格横向滚动、操作分组和状态 badge。
3. `codex/permission-drawer`：只将权限编辑容器改为右侧抽屉，不改权限字段或保存逻辑。
4. `codex/ui-polish-v2`：按页面分批进行整体 UI 高级化，不混入权限或 CloudBase 大改。
5. `codex/pre-deploy-check`：最终检查登录、角色权限、视角、时间轴、CloudBase 和部署配置；未经确认不部署。

## 14. CSS 搬家式拆分（2026-06-20）

### 14.1 分支与范围

- 分支：`codex/style-split`，基于稳定提交 `db04b72`；拆分提交为 `26d6397`。
- 只移动 CSS，不修改视觉、选择器、声明、class 名、React 组件或业务逻辑。
- `src/index.css` 从 4,865 行缩减为 10 行顺序导入，`App.tsx` 继续使用原入口路径。

### 14.2 样式模块

- `src/styles/base.css`：变量与全局基础规则。
- `src/styles/layout.css`：应用外壳和基础侧栏布局。
- `src/styles/timeline.css`：时间轴、顶部控制和数据区基础样式。
- `src/styles/editor.css`：弹窗、表单和早期编辑区样式。
- `src/styles/polish.css`：原 SaaS polish 层。
- `src/styles/edit-center.css`：编辑中心工作区细化样式。
- `src/styles/auth.css`：登录、侧栏账号、视角切换和无权限页样式。
- `src/styles/task-permissions.css`：本人任务高亮和任务权限提示。
- `src/styles/account.css`：账号与权限页基础样式。
- `src/styles/interaction-polish.css`：阶段 8 交互与视觉收口覆盖层。

### 14.3 验证结果

- 十个模块按导入顺序拼接后与 `git show db04b72:src/index.css` 字节完全一致：通过（84,759 字符）。
- `npm run lint`：通过。
- `npm run build`：通过；构建 CSS 仍为 `index-DOKv1m4D.css`，66.16 kB，说明产物未发生样式内容变化。
- `git diff --check`：通过。
- 1280 × 720 浏览器冒烟：时间轴、账号表格、权限弹窗、浅蓝成员视角提示和“我的任务”高亮均正常。
- 页面级横向溢出：无；账号表格继续在局部容器内横向滚动。
- 浏览器控制台：无应用错误。

### 14.4 下一步

CSS 拆分提交后，从该提交创建 `codex/account-table-ux`。下一分支只处理账号表格体验，不修改 users 数据结构、权限保存逻辑或 `realUser / viewUser / effectiveUser` 边界。
