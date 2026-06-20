# CSS Style Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 4,865-line `src/index.css` into ordered, focused stylesheet modules without changing selector text, declaration text, cascade order, class names, or rendered appearance.

**Architecture:** Keep `src/index.css` as a small import-only entrypoint so the existing `App.tsx` import remains unchanged. Move contiguous source ranges into `src/styles/*.css` in their original order; exact byte-for-byte concatenation against `git show HEAD:src/index.css` is the primary no-visual-change invariant.

**Tech Stack:** CSS, React 19, TypeScript, Vite 8, ESLint, Git.

---

### Task 1: Record the stable baseline

**Files:**
- Inspect: `src/index.css`
- Inspect: `src/app/App.tsx`

- [x] **Step 1: Confirm the branch and clean starting point**

Run:

```bash
git status --short --branch
git log -1 --oneline --decorate
```

Expected: branch is `codex/style-split`, HEAD is `db04b72`, and the only new change is this plan file.

- [x] **Step 2: Run the baseline checks**

Run:

```bash
npm run lint
npm run build
git diff --check
```

Expected: all commands pass; build may retain the existing chunk-size warning.

### Task 2: Perform the ordered stylesheet move

**Files:**
- Modify: `src/index.css`
- Create: `src/styles/base.css`
- Create: `src/styles/layout.css`
- Create: `src/styles/timeline.css`
- Create: `src/styles/editor.css`
- Create: `src/styles/polish.css`
- Create: `src/styles/edit-center.css`
- Create: `src/styles/auth.css`
- Create: `src/styles/task-permissions.css`
- Create: `src/styles/account.css`
- Create: `src/styles/interaction-polish.css`

- [x] **Step 1: Move contiguous ranges without rewriting CSS**

Use the committed `src/index.css` as the source and copy these inclusive line ranges exactly:

```text
src/styles/base.css                1-139
src/styles/layout.css             140-204
src/styles/timeline.css           205-960
src/styles/editor.css             961-1325
src/styles/polish.css             1326-2581
src/styles/edit-center.css        2582-3378
src/styles/auth.css               3379-3998
src/styles/task-permissions.css   3999-4065
src/styles/account.css            4066-4260
src/styles/interaction-polish.css 4261-4865
```

Do not alter whitespace, selectors, declarations, media queries, or comments inside the moved ranges.

- [x] **Step 2: Replace `src/index.css` with the ordered imports**

Set the complete file content to:

```css
@import './styles/base.css';
@import './styles/layout.css';
@import './styles/timeline.css';
@import './styles/editor.css';
@import './styles/polish.css';
@import './styles/edit-center.css';
@import './styles/auth.css';
@import './styles/task-permissions.css';
@import './styles/account.css';
@import './styles/interaction-polish.css';
```

Keep `src/app/App.tsx` unchanged; it must continue importing `../index.css`.

### Task 3: Prove cascade and content preservation

**Files:**
- Verify: `src/index.css`
- Verify: `src/styles/*.css`

- [x] **Step 1: Compare concatenated module bytes with the committed stylesheet**

Run a read-only Node check that obtains the committed source with `git show HEAD:src/index.css`, concatenates the ten module files in import order, and exits non-zero unless the two strings are identical.

Expected: output is `CSS byte equality: PASS`.

- [x] **Step 2: Confirm the entrypoint contains imports only**

Run:

```bash
wc -l src/index.css
rg -n -v "^@import |^$" src/index.css
```

Expected: `src/index.css` is approximately ten lines and the second command returns no unmatched CSS rules.

### Task 4: Verify build and UI stability

**Files:**
- Verify: `src/index.css`
- Verify: `src/styles/*.css`

- [x] **Step 1: Run repository checks**

Run:

```bash
npm run lint
npm run build
git diff --check
```

Expected: all commands pass; build output CSS size remains effectively unchanged from the baseline.

- [x] **Step 2: Run browser smoke checks at 1280px**

Start the Vite server and verify the login page, timeline, account table, permission modal, member task highlight, and perspective banner. Confirm there is no new horizontal page overflow or missing styling.

Expected: visual behavior matches the stable `db04b72` baseline.

### Task 5: Document and commit the isolated refactor

**Files:**
- Modify: `PROJECT_HANDOFF.md`
- Modify: `docs/superpowers/plans/2026-06-20-css-style-split.md`

- [x] **Step 1: Record completion in the handoff**

Add the branch name, module list, byte-equality result, lint/build/diff results, visual smoke result, and the rule that no selectors or business logic changed.

- [x] **Step 2: Mark completed plan checkboxes**

Change each executed checkbox in this plan from `[ ]` to `[x]` without altering the prescribed commands or scope.

- [x] **Step 3: Commit the CSS split**

Run:

```bash
git add src/index.css src/styles PROJECT_HANDOFF.md docs/superpowers/plans/2026-06-20-css-style-split.md
git diff --cached --check
git commit -m "refactor: split stylesheet into ordered modules"
```

Expected: commit succeeds on `codex/style-split`, and `git status --short` is empty afterward.
