# MEMORY — manfred-whiteboard

Session log. Newest first. One entry per working session; record what shipped, what is
half-done, and the next pickup point. Convert relative dates to absolute.

## YYYY-MM-DD — MWB-NNN · <short title> · <status>

- **Shipped:** what landed (PR #s).
- **Decisions:** non-obvious choices and why.
- **Next pickup:** the first thing to do next session.

---

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

