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
- **Next pickup:** the **coverage ratchet is red** — `npm run coverage:check` reports
  statements 22.5% against a 52.17% baseline (also functions 63.88% vs 66.66%). It was
  already red before this session: the baseline was set when the repo was almost all
  `lib` code, and the UI batch added ~1,100 untested view statements. 410 more covered
  statements reach the baseline; `src/App.tsx` alone holds 416 uncovered. Decide between
  writing component tests for the layer files (CanvasViewport 135, ShapeItem 122,
  ConnectorLayer 76, ZoomControls 70, DrawingLayer 62, yjs-provider 49, and the small
  ones), extracting App.tsx logic into tested helpers, or re-baselining deliberately.
  After that: plan task 11 (GitHub remote + Vercel), and file the Linear tickets.

