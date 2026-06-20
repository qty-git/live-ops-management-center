# System Permission Boundary and Account Deletion Design

## Goal

Make system management an implicit, non-configurable capability of the single built-in super administrator, and add safe deletion for ordinary login accounts without affecting timeline business data.

## Scope

This change covers the authentication and local user store only:

- enforce a single canonical `super_admin` account;
- hide system-management permissions from permission editing;
- remove system-management permissions from every non-super-admin account, including existing local data;
- prevent creation, promotion, demotion, or deletion from creating a second super administrator or removing the canonical one;
- allow the canonical super administrator to delete member, manager, and admin login accounts;
- keep the compact account table at four actions in two rows by placing deletion inside the account-edit modal.

It does not change timeline storage, TeamPerson records, historical tasks, CloudBase collections, or deployment configuration.

## Canonical super administrator

The system must contain exactly one super administrator.

- The canonical account is the existing built-in account identified by `system-super-admin`. For legacy stores without that ID, the existing `admin` username is adopted; if that username was previously changed, the remaining single `super_admin` is retained. The default account is created only when none of those signals exists.
- The canonical account is forced to role `super_admin` whenever the user store loads.
- Any additional legacy account with role `super_admin` is downgraded to `admin`. Its username, password, profile, status, and business permissions are preserved.
- New accounts cannot be created as `super_admin`.
- Ordinary accounts cannot be promoted to `super_admin`.
- The canonical account cannot be demoted or deleted. Its name, phone, position, password, and other non-role profile fields may still be edited through existing flows.
- The role control for the canonical account is rendered as a locked system role. The role choices for all other accounts contain only member, manager, and admin.

## Hidden system-management permissions

The visible “系统管理” group currently contains:

- `users:manage` — manage accounts;
- `permissions:manage` — assign configurable permissions;
- `perspective:switch` — switch member perspective;
- `data:delete` — perform protected destructive operations.

These permissions become system invariants rather than editable user choices.

- The permission editor does not render the “系统管理” group.
- The canonical super administrator always receives all four permissions during load, role normalization, and permission save. They cannot be removed by UI or by calling the user-store write function directly.
- member, manager, and admin accounts always have all four permissions removed during load, role normalization, and permission save. They cannot regain them through stale local data or a direct user-store call.
- The admin role default no longer includes account management or perspective switching.
- The permission editor counts only visible, configurable business permissions. Hidden system permissions do not inflate the “已选择” count.
- User-store write functions for account creation, profile editing, permission editing, password reset, status changes, and account deletion require both the appropriate permission and `actor.role === 'super_admin'`. This prevents an old session containing stale permission flags from bypassing the new role boundary.

The existing `users:view` compatibility permission is not part of the four-item system-management group and does not by itself expose the account page or permit a write. It may remain in old permission snapshots without granting system management.

## Migration and persistence

The persisted user-store shape remains unchanged, so the store version stays at v3.

On every load:

1. identify or create the canonical super administrator;
2. force its role to `super_admin`;
3. downgrade every other `super_admin` to `admin`;
4. force-add the four system-management permissions to the canonical account;
5. strip the four permissions from every other account;
6. persist the normalized store when roles or permissions differ from the stored v3 value.

This makes cleanup immediate for existing browsers instead of waiting for each account to be edited. Session restoration continues to revalidate against the normalized user store, so removed system permissions take effect on reload.

## Account deletion

Deletion is exposed in the existing “编辑账号资料” modal.

- A restrained red “删除账号” button appears in the modal footer only for member, manager, and admin targets.
- The canonical super administrator never sees a delete action for itself.
- Selecting delete opens a confirmation that names the account and explains that only the login account is removed.
- Confirming calls a new user-store deletion function; cancelling leaves all state unchanged.
- The deletion function requires a real `super_admin` actor with `users:manage`, rejects self-deletion, rejects every `super_admin` target, and rejects missing targets.
- A successful deletion removes only the `UserRecord`, closes the edit modal, refreshes the account list, and shows a success notice.
- TeamPerson data, person bindings on historical tasks, timeline plans, task ownership text, reports, and other business records are not deleted or rewritten.
- A deleted account cannot log in again. An already-open offline tab cannot be revoked immediately without a server session center, but its next normal session revalidation fails because the account no longer exists.

## UI behavior

- The account table keeps the existing four actions and its two-column, two-row fixed operation cell.
- No fifth table action is added, so row height and the 184px operation column remain unchanged.
- The permission modal shows only configurable business groups.
- The account form explains that the built-in super-administrator role is system locked when editing the canonical account.
- Deletion errors use the account page’s existing error notice; success uses its existing success notice.

## Error handling and defense in depth

- UI visibility is not the security boundary. Every user-store write function checks the actor role and permission.
- Permission normalization runs both when reading existing data and when saving an edited permission set.
- Role invariants run on creation, profile editing, and store load.
- Deletion re-fetches the target from the current store before enforcing self and role protection.
- Invalid or missing stored fields continue to use the existing normalization and fallback behavior.

## Validation

Static checks:

- `git diff --check` passes;
- `npm run lint` passes;
- `npm run build` passes.

Browser and data-boundary checks:

- the permission editor contains no “系统管理” legend or four system checkboxes;
- visible selected counts exclude hidden system permissions;
- the built-in super administrator still retains all four system permissions after saving business permissions;
- member, manager, and admin records containing legacy system permissions lose them on reload and cannot regain them by permission save;
- a legacy second `super_admin` becomes `admin` without losing its profile or password hash;
- new/edit role selectors cannot create a second super administrator;
- the canonical super-administrator role is locked;
- a temporary ordinary test account can be created and deleted from the edit modal;
- deletion removes only that user record and leaves TeamPerson and timeline store contents unchanged;
- attempts to delete self, a super administrator, or a missing target are rejected by the user store;
- the account table remains four buttons in two rows at 1280px;
- the browser console contains no application errors.

## Out of scope

- server-side authentication or remote session revocation;
- CloudBase user synchronization;
- deletion or anonymization of historical business data;
- a recycle bin or account-restore workflow;
- adding a second super administrator;
- changing the `realUser`, `viewUser`, or `effectiveUser` model.
