# Account Table UX Design

## Goal

Improve the desktop account-management table at 1280px without compressing or removing fields and without changing account data, permissions, persistence, or CloudBase behavior.

## Approved layout

- Keep the table's horizontal scrolling and make the scroll affordance explicit.
- Keep the operation column fixed on the right while data columns scroll beneath it.
- Arrange the four available actions in a compact two-column, two-row grid.
- Keep action labels visible; do not replace them with icon-only controls or an overflow menu.
- Keep the operation column narrow enough to preserve data visibility, targeting about 184px instead of the current 278px action area.
- Prevent action labels from wrapping.
- Use a restrained red treatment for the disable action and the existing green treatment for enable.
- Render position as a neutral badge alongside the existing role and status badges.
- Preserve the protected-super-admin state in the fixed operation column.

## Behavior boundaries

The change is presentational only. It must not modify:

- `users` data structures or stored values;
- `canManageUsers`, `canManagePermissions`, or target-user protection checks;
- modal open/save/reset/status-change handlers;
- `realUser`, `viewUser`, or `effectiveUser` boundaries;
- CloudBase configuration or deployment behavior.

## Responsive boundary

Desktop and tablet layouts continue to use the wide table and horizontal scrolling. A card layout for small screens is explicitly deferred.

## Validation

- ESLint and production build pass.
- At 1280px, the page has no document-level horizontal overflow.
- The table wrapper remains horizontally scrollable.
- The operation column stays visible while the table scroll position changes.
- Action buttons appear as two rows and do not wrap internally.
- Role, position, and status badges remain legible.
- Existing actions still open their original UI and retain permission visibility rules.
