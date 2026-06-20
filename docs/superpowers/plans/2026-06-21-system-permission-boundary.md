# System Permission Boundary and Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce one built-in super administrator with hidden, non-removable system permissions and let that account safely delete ordinary login accounts from the edit modal.

**Architecture:** Centralize the four restricted permissions in `permissions.ts`, normalize them at every user-store read/write boundary, and add explicit super-admin role checks to account mutations. Keep UI controls descriptive rather than authoritative: hide system permissions, lock the canonical role, and call a protected `deleteUser` store function from the existing edit modal.

**Tech Stack:** React 19, TypeScript 6, localStorage, Vite 8, ESLint, in-app browser automation

---

### Task 1: Centralize hidden system-permission invariants

**Files:**
- Modify: `src/modules/auth/permissions.ts`
- Modify: `src/modules/auth/accessControl.ts`

- [x] **Step 1: Define the restricted permission set and configurable permissions**

Add these exports after `BUSINESS_PAGE_PERMISSIONS`:

```ts
export const SYSTEM_MANAGEMENT_PERMISSIONS = [
  'users:manage',
  'permissions:manage',
  'perspective:switch',
  'data:delete',
] as const satisfies readonly Permission[]

const systemManagementPermissionSet = new Set<Permission>(SYSTEM_MANAGEMENT_PERMISSIONS)

export function isSystemManagementPermission(permission: Permission): boolean {
  return systemManagementPermissionSet.has(permission)
}
```

Remove `users:manage` and `perspective:switch` from the admin defaults. Remove the “系统管理” object from `PERMISSION_GROUPS`, then export the visible permission order:

```ts
export const CONFIGURABLE_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.permission))
```

- [x] **Step 2: Enforce the role boundary in permission normalization**

Refactor `normalizeUserPermissions` so it first selects valid stored/default permissions, optionally adds migration defaults, then force-adds system permissions for `super_admin` and strips them for all other roles:

```ts
export function normalizeUserPermissions(role: UserRole, value: unknown, migratePagePermissions = false): Permission[] {
  const stored = Array.isArray(value) ? value.filter(isPermission) : getDefaultRolePermissions(role)
  const permissions = migratePagePermissions ? [...stored, ...DEFAULT_ROLE_PERMISSIONS[role]] : stored
  const normalized = new Set(permissions)

  if (role === 'super_admin') {
    SYSTEM_MANAGEMENT_PERMISSIONS.forEach((permission) => normalized.add(permission))
  } else {
    SYSTEM_MANAGEMENT_PERMISSIONS.forEach((permission) => normalized.delete(permission))
  }

  return PERMISSIONS.filter((permission) => normalized.has(permission))
}
```

- [x] **Step 3: Tighten perspective switching to the sole system role**

Change `canSwitchPerspective` to require `realUser.role === 'super_admin'` as well as the hidden permission.

- [x] **Step 4: Run TypeScript and lint checks**

Run: `npm run lint && npm run build`

Expected: both commands exit 0; Vite may retain the existing bundle-size warning.

### Task 2: Normalize one canonical super administrator

**Files:**
- Modify: `src/modules/auth/userStore.ts`

- [x] **Step 1: Make v3 load normalization persist role or permission corrections**

In `loadUserStore`, replace the narrow version/length persistence condition with a serialized comparison:

```ts
if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalized))
}
```

- [x] **Step 2: Canonicalize roles after parsing users**

In `normalizeUserStore`, locate the canonical user by `system-super-admin`, then legacy username `admin`, then the remaining single `super_admin` when a legacy username was changed. Create the default account only when none exists. Map all users so the canonical record is `super_admin`, any other `super_admin` becomes `admin`, and each permission array is passed through `normalizeUserPermissions(nextRole, user.permissions, migratePermissions)`.

The canonical record must keep its current ID, password hash, profile, status, and timestamps when adopting a legacy `admin` username.

- [x] **Step 3: Reject creation, promotion, and demotion that break uniqueness**

Replace `assertSuperAdminBoundary` with two explicit guards:

```ts
function assertCreatableRole(role: UserRole): void {
  if (role === 'super_admin') throw new Error('系统只保留一个内置超级管理员账号')
}

function assertRoleMayBeUpdated(target: UserRecord, nextRole: UserRole): void {
  if (target.role === 'super_admin' && nextRole !== 'super_admin') throw new Error('内置超级管理员角色不可修改')
  if (target.role !== 'super_admin' && nextRole === 'super_admin') throw new Error('系统不允许新增超级管理员')
}
```

Use the first in `createUser` and the second in `updateUserProfile`.

- [x] **Step 4: Require a real super administrator for all account mutations**

Replace direct mutation permission assertions with:

```ts
function assertSystemManager(actor: UserActor, permission: Permission, message: string): void {
  if (actor.role !== 'super_admin' || !hasPermission(actor, permission)) throw new Error(message)
}
```

Apply it to create, profile update, permission update, password reset, status change, and the deletion function in Task 3.

- [x] **Step 5: Run lint and production build**

Run: `npm run lint && npm run build`

Expected: exit 0 and no TypeScript errors.

### Task 3: Add the protected user-store deletion function

**Files:**
- Modify: `src/modules/auth/userStore.ts`

- [x] **Step 1: Add `deleteUser`**

Export this mutation beside the other account writes:

```ts
export function deleteUser(store: UserStore, userId: string, actor: UserActor): UserStore {
  assertSystemManager(actor, 'users:manage', '你没有权限删除账号')
  const target = requireUser(store, userId)
  if (target.id === actor.id) throw new Error('不能删除当前登录账号')
  if (target.role === 'super_admin') throw new Error('内置超级管理员账号不可删除')
  return saveUserStore({ ...store, users: store.users.filter((user) => user.id !== userId) })
}
```

- [x] **Step 2: Verify the store guards are independent of UI state**

Run:

```bash
rg -n "assertSystemManager|assertCreatableRole|assertRoleMayBeUpdated|export function deleteUser" src/modules/auth/userStore.ts
```

Expected: every account mutation calls `assertSystemManager`, and deletion includes self and super-admin checks.

### Task 4: Hide system permissions and lock the system role in the UI

**Files:**
- Modify: `src/modules/auth/components/PermissionEditorModal.tsx`
- Modify: `src/modules/auth/components/UserFormModal.tsx`

- [x] **Step 1: Save and count only configurable permissions**

Replace the `PERMISSIONS` import with `CONFIGURABLE_PERMISSIONS`. Initialize selected business permissions from the user snapshot, save only that ordered set, and compute `selectedCount` from it. The user-store normalizer restores hidden system permissions for the canonical super administrator.

- [x] **Step 2: Remove super-admin role creation from the form API**

Delete `canUseSuperAdminRole` from `UserFormModalProps`. Use `USER_ROLES.filter((option) => option !== 'super_admin')` for ordinary role choices.

- [x] **Step 3: Render the canonical role as locked**

When `user?.role === 'super_admin'`, render a disabled text input with value `超级管理员（系统内置）` instead of the role selector. Keep the internal form role state at `super_admin` so profile saves preserve the role.

- [x] **Step 4: Add the modal delete action**

Add optional `onDelete?: () => void` to `UserFormModalProps`. When editing a non-super-admin target, render a full-width footer wrapper with a left-aligned restrained `danger-button` labeled “删除账号” and the existing cancel/save actions on the right. Do not render it while creating or editing the canonical super administrator.

### Task 5: Connect deletion to account-page state

**Files:**
- Modify: `src/modules/auth/pages/UserManagementPage.tsx`
- Modify: `src/styles/interaction-polish.css`

- [x] **Step 1: Add the page deletion handler**

Import `deleteUser`, then add a handler that checks `users:manage`, rejects super-admin targets, confirms `确认删除账号“<username>”？删除后该账号无法登录，但不会删除人员、排班或历史任务。`, calls the store mutation, closes the edit modal, and commits notice `账号已删除`.

- [x] **Step 2: Remove the obsolete super-admin role prop and pass deletion only for ordinary accounts**

Update both `UserFormModal` call sites. Creation receives no role-capability prop. Editing receives `onDelete={() => removeUser(editingUser)}` only when `editingUser.role !== 'super_admin'`.

- [x] **Step 3: Style the split footer and locked role**

Add `.account-form-footer`, `.account-form-footer-actions`, and `.system-role-field` rules. The footer spans the modal width, keeps delete on the left, and stacks safely below 640px. Reuse the existing `danger-button` styling rather than adding a stronger destructive color.

- [x] **Step 4: Confirm the table still has exactly four row actions**

Run:

```bash
rg -n "编辑资料|编辑权限|重置密码|禁用账号|启用账号|删除账号" src/modules/auth/pages/UserManagementPage.tsx src/modules/auth/components/UserFormModal.tsx
```

Expected: delete appears only in `UserFormModal`; the table action markup is unchanged.

### Task 6: Validate migration, UI, and business-data isolation

**Files:**
- Modify: `docs/superpowers/plans/2026-06-21-system-permission-boundary.md`
- Modify: `PROJECT_HANDOFF.md`

- [x] **Step 1: Run static verification**

Run: `git diff --check && npm run lint && npm run build`

Expected: all commands pass; only the known Vite bundle-size warning may remain.

- [x] **Step 2: Verify migration with controlled browser-local fixtures**

In a dedicated local browser test state, record timeline-store JSON, then inject a v3 user store containing the canonical account, an extra `super_admin`, and an admin with all four hidden permissions. Reload and verify:

- one and only one `super_admin` remains;
- the extra super administrator is now admin;
- every non-super account lacks all four system permissions;
- the canonical account has all four;
- normalized v3 JSON is persisted;
- timeline-store JSON is byte-for-byte unchanged.

- [x] **Step 3: Verify permission and role UI**

At 1280×720:

- open the canonical account permission editor and confirm no “系统管理” group appears;
- confirm selected counts equal visible business selections;
- open the canonical profile and confirm the system role is disabled;
- open an ordinary profile and confirm the role list contains member, manager, and admin only;
- confirm the account table still shows four buttons in two rows.

- [x] **Step 4: Verify deletion using a temporary account**

Create an ordinary temporary login account, open its edit modal, cancel deletion once, then confirm deletion. Verify the account row disappears, login fails for that username, and timeline-store JSON remains unchanged. Do not delete existing user data.

- [x] **Step 5: Check browser errors**

Expected: no application warnings or errors in the browser console.

- [x] **Step 6: Record completion and commit**

Update `PROJECT_HANDOFF.md`, check all plan boxes, then run:

```bash
git add PROJECT_HANDOFF.md docs/superpowers/plans/2026-06-21-system-permission-boundary.md src/modules/auth/permissions.ts src/modules/auth/accessControl.ts src/modules/auth/userStore.ts src/modules/auth/components/PermissionEditorModal.tsx src/modules/auth/components/UserFormModal.tsx src/modules/auth/pages/UserManagementPage.tsx src/styles/interaction-polish.css
git commit -m "feat: restrict system permissions and delete accounts"
```

Expected: one focused implementation commit after the design commit and a clean worktree.
