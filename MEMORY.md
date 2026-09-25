# MEMORY — manfred-whiteboard

Session log. Newest first. One entry per working session; record what shipped, what is
half-done, and the next pickup point. Convert relative dates to absolute.

## YYYY-MM-DD — MWB-NNN · <short title> · <status>

- **Shipped:** what landed (PR #s).
- **Decisions:** non-obvious choices and why.
- **Next pickup:** the first thing to do next session.

---

## 2026-09-25 — STU-953 · text objects with auto-height · shipped

- **Shipped:** eight-task SDD branch (feat/STU-953-text-object, commits 52b07ba..c1ae46e,
  open as draft PR #19) delivering text objects: bare text on the canvas, user-set width,
  height derived from content. `TextElement` carries `text`, `fontSize`, optional
  `fontFamily`, `textAlign`, `textColor`. Height is stored (not recomputed) and follows as
  the user types. Text colour control added to properties bar, reaching text objects,
  sticky notes and shape labels. Text layout computed by a single pure module
  (`src/lib/text-layout.ts`) that both canvas and export call, guaranteeing identical
  wrapping. Shape tools grouped into one button with dropdown flyout to fit 393px
  viewport. Creating text enters edit mode immediately. Deleting all text or Escape on a
  never-typed object removes it. CI green on all six gates (unit, component, E2E, axe,
  coverage, lint).
- **Decisions:**
  - Shape tools go behind a flyout button (not moved to the bar) — the toolbar is already
    tight at 393px and this preserved the 40px button size, WCAG 2.5.5 target, and
    keyboard shortcuts. APG disclosure pattern: flyout opens on Space/Enter, closes on
    blur or selection.
  - Whitespace-only lines are preserved as blank lines (not trimmed), so stored text
    matches what was typed. Collapsing internal runs and trimming leading indentation
    remain unchanged. Documented with regression tests.
  - Height clamping happens at render time (Math.max drawn vs stored) not at patch time,
    so the stored value is always visible — an empty object has height 0 in the document,
    matching the JSON export.
  - Undo coalescing: `useUndoRedo` does no coalescing itself; Y.UndoManager handles it at
    yjs-provider.ts:58, defaulting to 500ms `captureTimeout`. Found by the review process,
    not assumed.
  - Measure injection seam (optional, lazy) makes the font-family half of text behaviour
    testable and removes jsdom's getContext error noise at import time.
  - Escape on a never-typed text object abandons the creation (removes it); Escape on text
    with content preserves it. Regression-locked.
- **Dispatch log captured:** 8 tasks, 7 dispatches (Task 8 is documenter, this session).
  Task 1–2 implementation, review, and 2 fix rounds each (Haiku). Task 3 component +
  element-style + resize (Sonnet, Opus review, 1 pre-review + 1 fix round). Task 4 export
  (Haiku, Sonnet review, 1 fix round). Task 5 toolbar + keyboard (Sonnet, Opus review, 2
  fix rounds, includes focus restoration bug fix). Task 6 wiring + selectors (Sonnet, Opus
  review, 2 fix rounds, unauthorized PR push recovered). Task 7 text colour bar (Sonnet,
  Sonnet review, 0 fix rounds, caught STU-927 regression). All commits message correctly
  formatted; all tests passing; all mutation-verified fixes restored.
- **Most valuable catches:**
  - Three structural tests were self-fulfilling because they computed through shared maths
    whether or not they exercised the feature. Mutation-testing caught all three.
  - Focusing an input from the same pointerdown that created it loses a race: the canvas's
    native tabIndex=0 default refocuses it after listeners finish, stealing focus before
    the blur fired. Deferring focus one tick fixed it; only a real browser could see it.
  - Board-selectors.ts had no owner (plan defect) and dropped every text element from the
    render pipeline silently. Caught by the review process, not pre-existing.
- **Next pickup:** open tickets STU-927 (panel clipping at screen edge), STU-964 (ten SVG
  colour interpolations need escaping, text one was fixed inline), STU-926 (typecheck
  project scope for specs). Dispatch log and whole-branch review details at
  docs/superpowers/plans/2026-09-25-text-object.md.

---

## 2026-09-24 — STU-925 · fill patterns for shapes · shipped

- **Shipped:** five 1-bit mono fill patterns for shapes (hatch, crosshatch, dots/Ben-Day,
  checker, scanline), drawn in the shape's border colour. No new colour field; pattern is
  optional (`pattern?: FillPattern`), so undefined boards render unchanged. Geometry lives
  in one tested module (`src/lib/fill-patterns.ts`) feeding both canvas (`ShapeItem.tsx`)
  and SVG/PNG export (`board-export.ts`). Pattern def ids are `pattern-<elementId>`, unique
  by construction. Picker is a second row in the Fill popover (shape-only), gated to fit
  within the bar at 393px. Labels on dense ink get a text halo in the shape's fill colour.
- **Decisions:**
  - Pattern defs unique by element ID, avoiding axe's `duplicate-id` violations.
  - Coordinate space as part of the geometry contract: canvas uses `patternUnits="userSpaceOnUse"`
    with no `x`/`y` (shape-local origin), export sets `x`/`y` to element position
    (board-space origin) to keep phase alignment.
- **Next pickup:** STU-926 (specs outside the typecheck project) and STU-927
  (properties-bar panels open off left edge), both filed and unstarted.

---

## 2026-09-24 — STU-924 · role-based agents installed · shipped

- **Shipped:** eight named roles installed at `.claude/agents/*.md` (strategist,
  analyst, designer, architect, builder, tester, documenter, release-manager),
  each bound to a specific Claude model via frontmatter (Fable / Opus /
  Sonnet / Haiku). Human-readable convention at `knowledge/roles.md`;
  router table + hat/dispatch paragraph added to `AGENTS.md` above the per-PR
  rhythm. Ships from `manfred-bootstrap` STU-917.
- **Decisions:** `tools:` frontmatter intentionally omitted (open access; lock
  down later per bootstrap STU-920).
- **Next pickup:** first time you dispatch a role subagent, eyeball that the
  bound model actually answers (Fable in particular — see bootstrap STU-921
  for the durability check).

## 2026-09-21 — canvas batch landed · a11y + multiplayer fixed · in progress

- **Shipped:** the uncommitted canvas batch (plan tasks 6-10) split into seven commits:
  sticky notes/shapes/selection, connector + drawing layers, multiplayer cursors +
  presence, toolbar + top nav, keyboard-operable viewport, ws relay, App wiring. Then
  the multi-tab E2E spec, the relay port fix and the contrast fix. No PR — the branch
  has no remote yet.
- **Decisions:**
  - Commits carry no `MWB-NNN` refs: no Linear tickets exist for this work and the user
    chose to file them later rather than have them created.
  - Toolbar rebuilt to the ARIA APG pattern (roving tabindex) rather than leaving eight
    tab stops; focus movement deliberately does not change the active tool.
  - The canvas region keeps `tabIndex` via two *scoped, commented* jsx-a11y disables
    instead of relaxing the rules project-wide — the exemption is only valid because
    `handleKeyDown` makes the region genuinely keyboard-operable (WCAG 2.1.1).
  - Pure logic (`stroke-path`, `keyboard-viewport`) pulled into `src/lib` so it is
    testable without rendering, per the "extract a helper" tactic.
  - Axe ratchet promoted: CI now runs the sweep with `AXE_ENFORCE=1`.
- **Coverage, resolved:** all three options were taken. Logic extracted from `App.tsx`
  into five tested `lib` modules (514 to 381 lines), the whole component layer covered,
  and the baseline then raised to 97.73%/89.75%/91.95%. 193 unit tests, 8 E2E.
- **Bugs the new tests caught:** dragging teleported an element's corner to the cursor
  (drag origin was the element position, not the pointer's); and `fireEvent.pointer*` in
  jsdom was dropping coordinates entirely for want of a `PointerEvent` polyfill, so
  pointer assertions had been meaningless.
- **Shipped to GitHub + Vercel (2026-09-22):** repo created **public** at
  Studio-Manfred/manfred-whiteboard, `main` fast-forwarded to the full branch, CI green
  (verify 44s, E2E 1m3s, 8 specs under `AXE_ENFORCE=1`), and a preview deployment is
  Ready and serving (SPA rewrite and both bundles verified with `vercel curl` — plain
  curl only sees the Deployment Protection redirect). Plan task 11 is now done bar the
  production promotion.
- **Deploy gotchas, both hit:** the repo needed package read access for CI, and Vercel
  needed `GITHUB_TOKEN` added *per environment* (Production alone did not cover the
  preview build). Both logged in `knowledge/ERRORS.md`.
- **Still declared, still unused:** `@studio-manfred/manfred-design-system` is in
  `package.json` but imported by no file. Kept deliberately (user's call), at the cost
  of a credential in the Vercel env and a public repo outsiders cannot install.
- **Production hardening (2026-09-22):** a built app no longer falls back to the
  localhost relay — `resolveWsUrl` returns null in a production build with no
  `VITE_WS_URL`, so the deployed board is deliberately local-only instead of hammering
  each visitor's own port 4444. Playwright's preview build now sets `VITE_WS_URL`
  explicitly, which is what keeps the multiplayer specs meaningful.
- **Relay parked (2026-09-22), by decision.** The deployed board stays local-only for
  now; the work is captured in Linear rather than carried as a loose end.
- **Linear caught up:** project **Manfred Whiteboard** (P-STU-21) with the shipped work
  written up, plus STU-853 relay (parked, Backlog), STU-854 export, STU-855 colour
  picker, STU-856 undo/redo controls, STU-857 marquee selection, STU-859 token scope.
  Note the team key is **STU**, not the `MWB` these docs used to claim — corrected in
  CLAUDE.md and AGENTS.md.
- **Four feature PRs open (2026-09-22), stacked.** #1 STU-856 undo/redo buttons → #2
  STU-855 colour picker → #3 STU-857 marquee multi-select → #4 STU-854 board export.
  Each branches off the one before, so **merge in order 1→2→3→4**; GitHub retargets each
  to `main` as the one below lands.
- **CI does not run on stacked PRs.** `.github/workflows/ci.yml` filters
  `pull_request: branches: [main]`, which matches the *base* branch — so #2–#4 only got
  Vercel checks. They pick up CI the moment they retarget to `main`. Everything was
  verified locally: 322 unit tests, 12 E2E, coverage 98.37%.
- **Decisions made with the user:** undo/redo live in the top bar (keeps the toolbar a
  pure tool picker); marquee selects anything it clips, not just what it fully contains;
  branch-and-PR per ticket.
- **Worth remembering:** screenshots of the real preview build caught two bugs unit tests
  could not — the palette claiming a colour a transparent shape was not wearing, and the
  PNG export missing the arrowhead the board draws. Keep eyeballing exports and popovers.
- **Next pickup:** UX/UI and features — STU-855, STU-856 and STU-857 are the ones that
  change how the board feels to use; STU-854 is the last piece of the original plan (`ws-server.mjs` is dev-only; hosted multiplayer
  needs a relay host and `VITE_WS_URL`). Then the task 9 gaps: PNG/JSON export,
  toolbar colour picker, undo/redo buttons. `SelectionOverlay` is written and tested
  but never rendered by App — wire up marquee selection or delete it. Linear tickets
  still need filing.

