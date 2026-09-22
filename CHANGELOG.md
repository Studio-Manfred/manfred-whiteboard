# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Sticky notes with double-click inline editing, rectangle and circle shapes, and a
  selection overlay.
- Dynamic Bézier connectors and a freehand pen, with stroke smoothing extracted to
  `src/lib/stroke-path.ts`.
- Multiplayer cursors and an active-user presence list driven by Yjs awareness.
- Floating tool toolbar and top navigation bar.
- Keyboard operation of the canvas viewport: arrow keys pan, `+`/`-` zoom, `0` resets.
- Minimal y-websocket relay (`server/ws-server.mjs`) for local multiplayer.
- Multi-tab Playwright spec covering element, text and presence sync across two
  browser contexts.
- Unit and component tests across the canvas and UI layer, an App integration test
  driving the real component tree against an in-memory Yjs document, and a
  `PointerEvent` polyfill in the test setup (jsdom has none).
- `README.md` (including deployment setup and the single-player caveat) and this
  changelog.

### Changed

- The toolbar is a `div` with `role="toolbar"` following the ARIA APG pattern — one tab
  stop, roving tabindex, arrow-key and Home/End focus movement — instead of a `nav`
  landmark carrying an interactive role.
- Board logic extracted out of `App.tsx` (514 to 381 lines) into tested helpers:
  `element-factories`, `board-selectors`, `board-mutations`, `tool-shortcuts` and
  `user-identity`.
- The eraser removes the topmost element under the cursor rather than the first one
  found in map order — what the user can actually see.
- Coverage ratchet baseline raised to 97.73% statements / 89.75% branches / 91.95%
  functions, from a 52.17% floor the repo had already fallen through.
- CI runs the axe sweep with `AXE_ENFORCE=1`, so new accessibility violations block the
  build rather than printing a warning.

### Fixed

- Multiplayer never connected: the client dialled `ws://localhost:1234` while the relay
  listens on `4444`, so every tab silently fell back to its local IndexedDB copy. The
  endpoint now defaults to the relay's port and can be overridden with `VITE_WS_URL`.
- Dragging an element moved its top-left corner onto the cursor instead of moving it by
  the drag delta, because the drag origin was the element's position rather than the
  pointer's.
- Room name chip failed WCAG AA contrast (4.34:1 against the 4.5:1 required at 12px).
