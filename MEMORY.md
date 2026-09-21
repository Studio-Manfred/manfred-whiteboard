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
- **Next pickup:** plan task 11 — no git remote, no GitHub repo, no Vercel link — and
  note a deployed build has no relay (`ws-server.mjs` is dev-only; hosted multiplayer
  needs a relay host and `VITE_WS_URL`). Then the task 9 gaps: PNG/JSON export,
  toolbar colour picker, undo/redo buttons. `SelectionOverlay` is written and tested
  but never rendered by App — wire up marquee selection or delete it. Linear tickets
  still need filing.

