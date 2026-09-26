# MEMORY — manfred-whiteboard

Session log. Newest first. One entry per working session; record what shipped, what is
half-done, and the next pickup point. Convert relative dates to absolute.

## YYYY-MM-DD — MWB-NNN · <short title> · <status>

- **Shipped:** what landed (PR #s).
- **Decisions:** non-obvious choices and why.
- **Next pickup:** the first thing to do next session.

---

## 2026-09-26 — STU-975 · more text sizes, up to 500px · shipped (commit pending PR)

- **Shipped:** `FONT_SIZES` (`src/lib/element-style.ts:28`) grows from 6 to 17 sizes,
  adding 18 and 28 mid-ramp and topping out at 500 — every prior size survives, so no
  board's appearance changes. The real work: `OptionList` (`PropertiesBar.tsx`, shared by
  font size, font family, thickness and alignment) had no max-height at all, while
  `contextBarPosition` (`context-bar.ts:94`) only reserves `PANEL_ALLOWANCE` (160px) of
  headroom before letting a panel open upward. A 17-item list at the real, measured ~32px
  row height (34px including the `gap-0.5` between rows) runs to 576px — well past what
  placement assumed — so it would have opened above and run off the top of the screen.
  Fixed by giving `OptionList` `style={{ maxHeight: `${PANEL_ALLOWANCE}px` }}` plus
  `overflow-y-auto`, importing `PANEL_ALLOWANCE` rather than retyping 160, so the two
  values can't drift apart again. Tests: `test/element-style.test.ts` (ramp strictly
  ascending, keeps every prior size, tops at 500) and `test/PropertiesBar.test.tsx` (cap
  applied and equal to `PANEL_ALLOWANCE`, full 17-item list still renders every option
  under the cap, short lists — thickness, alignment — unaffected). All four are unit-level
  and jsdom does no layout, so they only prove the style is applied; the real "does it fit
  and scroll" proof was a throwaway Playwright spec at the Pixel 5's 393px width (deleted
  before commit, per convention) — it confirmed the capped list's rendered height is
  exactly 160px, `scrollHeight` (576) exceeds `clientHeight` (160), forcing `scrollTop`
  actually moves it, and a 500px text object renders without breaking (wraps to one
  character per line at the default 240px object width — expected, not a bug, since no
  width that narrow can hold a 500px glyph). All six gates green (unit 750, typecheck,
  lint, coverage ratchet held with margin, E2E 84).
- **Decisions:**
  - Measured the row-height assumption from `docs/context/STU-975.md` rather than trusting
    it: the ~32px estimate was exactly right (32px per button, 34px row-to-row with the
    2px gap). Recorded here in case whoever next tunes `PANEL_ALLOWANCE` wants the real
    number instead of re-deriving it.
  - Did not export `OptionList` for direct unit testing — tests go through the existing
    `render(<PropertiesBar .../>)` + `fireEvent.click` + `role="dialog"` pattern the rest of
    `test/PropertiesBar.test.tsx` already uses, so the panel-cap tests read the same way as
    every other control in that file.
  - Out of scope, deliberately untouched: STU-927 (panels clip at the left edge) and
    STU-974 (the bar covers the top anchor). Both live in the exact files this ticket
    touched; the browser checks were placed clear of both.
- **Next pickup:** none — bounded ticket, fully closed. STU-973 (docs-in-same-PR vs. role
  definition conflict) is filed but not this ticket's to resolve.

---

## 2026-09-25 — STU-972 · connect arrows to text objects, connector cleanup on delete · shipped

- **Shipped:** text objects are valid arrow endpoints — the same four edge anchors
  (`onAnchorDragStart`, `onAnchorKeyActivate`, `showAnchors`, `highlightedAnchor`) sticky
  notes and shapes already had, copied from `StickyNote.tsx`'s pattern and wired into
  `App.tsx`'s `TextItem` branch. `canBeAnEndpoint` (`src/lib/connector-drag.ts`) grew one
  line to admit `type === 'text'`; frames and drawings stay refused. Separately,
  `removeElements` (`src/lib/board-mutations.ts`) now deletes any connector whose `fromId`
  or `toId` points at an element being removed, inside the same `transact()` as the
  deletion, for every element type. Branch `feat/STU-972-connect-text`: red commit
  bfd7f22 (14 pre-written failing specs across `board-mutations.test.ts`,
  `connector-drag.test.ts`, `TextItem.test.tsx`, left untouched throughout), green commit
  fd32402 (builder), plus a follow-up round adding a jsdom regression test for the
  edit-mode anchor ruling and this entry. All six gates green (unit 742, typecheck, lint,
  coverage ratchet held, E2E 78).
- **Decisions:**
  - Connector cleanup lives in `removeElements` itself, not special-cased for text — one
    fix closes STU-862 for every element type (sticky, shape, text, and connectors
    joining two elements that are both being deleted in the same call) rather than just
    the type this ticket happened to be about.
  - This closes the leak going forward only: it prevents *new* orphaned connectors from
    being created, but does not sweep connectors already orphaned on existing boards
    before this shipped. That cleanup, if wanted, is a separate piece of work.
  - Anchors are hidden — absent from the DOM, not just visually hidden — while a text
    object is being edited. The original design left this as an unverified assumption
    (anchors sitting outside the box wouldn't fight the textarea); rather than verify it,
    the assumption was dropped: while typing, you are not connecting. Regression-locked
    in `TextItem.test.tsx` (two tests: all four anchors present when not editing, zero
    anchors in the document while editing) — confirmed by deliberately removing the
    `!isEditing` gate and watching the edit-mode test fail before restoring it.
  - `board-mutations.ts`'s header comment claimed every mutation transacts inside one Yjs
    transaction; `patchElement` never has (no `elementOrder` change to keep in step with).
    Corrected the comment to explain why, rather than just deleting the false claim.
    `patchElement`'s behaviour is unchanged.
- **Next pickup:** the pre-existing orphan sweep (connectors already broken on boards from
  before this ticket) is unaddressed and would need its own ticket. STU-927 (properties
  bar clipping the left edge on narrow viewports) is still open and was worked around
  again in throwaway E2E coordinates, same as `fill-pattern.spec.ts` already does.

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

