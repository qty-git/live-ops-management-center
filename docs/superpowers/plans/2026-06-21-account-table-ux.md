# Account Table UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the account table easier to scroll and operate at 1280px with a compact, fixed two-row action column and a neutral position badge.

**Architecture:** Keep the existing `UserManagementPage` data flow and handlers intact, adding only semantic class names and a scroll hint in JSX. Implement the visual behavior in the account-specific stylesheet loaded last enough to override existing account styles, with sticky table cells rather than a duplicate action overlay.

**Tech Stack:** React 19, TypeScript, CSS, Vite, ESLint

---

### Task 1: Add account-table presentation hooks

**Files:**
- Modify: `src/modules/auth/pages/UserManagementPage.tsx`

- [x] **Step 1: Add the scroll hint and semantic table hooks**

Insert an explanatory element immediately before `.user-table-wrap`, add `user-actions-heading` to the operation header, add `account-position` around the position text, and add `user-actions-cell` to the operation cell. Keep all conditions and event handlers byte-for-byte equivalent in behavior:

```tsx
<p className="user-table-scroll-hint">
  <span aria-hidden="true">↔</span> 左右滑动查看更多账号字段，操作列始终可见
</p>
<div className="table-wrap user-table-wrap">
  {/* existing table */}
</div>
```

```tsx
<th className="user-actions-heading">操作</th>
<td><span className="account-position">{user.position}</span></td>
<td className="user-actions-cell">
```

- [x] **Step 2: Run lint to verify the markup remains valid**

Run: `npm run lint`

Expected: ESLint exits with code 0 and reports no warnings or errors.

### Task 2: Implement compact sticky account actions

**Files:**
- Modify: `src/styles/interaction-polish.css`

- [x] **Step 1: Add the scroll affordance and badge styling**

Add account-scoped rules for `.user-table-scroll-hint`, `.user-table-wrap`, and `.account-position`. The hint must be concise and the position badge must use neutral gray styling.

- [x] **Step 2: Replace the wide wrapping action area with a fixed two-by-two grid**

Set the action header and cells to `position: sticky; right: 0`, use a solid background and left-side shadow, and set the action grid to two equal columns with a total width near 184px:

```css
.user-actions {
  width: 168px;
  min-width: 168px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
```

Keep each `.table-action` on one line and centered. Ensure disabled rows and row hover states do not make the sticky cell transparent.

- [x] **Step 3: Verify selectors describe the approved layout**

Run:

```bash
rg -n "user-table-scroll-hint|user-actions-heading|user-actions-cell|account-position|grid-template-columns" src/modules/auth/pages/UserManagementPage.tsx src/styles/interaction-polish.css
```

Expected: JSX hooks and matching CSS rules are present; the action layout uses two columns.

### Task 3: Validate and stabilize the branch

**Files:**
- Modify: `docs/superpowers/plans/2026-06-21-account-table-ux.md`

- [x] **Step 1: Run static verification**

Run: `npm run lint && npm run build`

Expected: both commands exit with code 0 and Vite emits a production bundle.

- [x] **Step 2: Run a 1280px browser smoke test**

Open the local account-management page at 1280×720 and verify:

- the document itself has no horizontal overflow;
- `.user-table-wrap` has `scrollWidth > clientWidth`;
- changing `scrollLeft` does not move the right edge of `.user-actions-cell`;
- each manageable account shows its permitted actions in two columns;
- the position badge and scroll hint render clearly;
- editing, permissions, reset-password, and status controls still invoke their original UI when visible.

- [x] **Step 3: Record completion and commit**

Mark completed checklist items, then run:

```bash
git add .gitignore docs/superpowers/specs/2026-06-21-account-table-ux-design.md docs/superpowers/plans/2026-06-21-account-table-ux.md src/modules/auth/pages/UserManagementPage.tsx src/styles/interaction-polish.css
git commit -m "feat: improve account table actions"
```

Expected: one focused commit on `codex/account-table-ux` and a clean worktree.
