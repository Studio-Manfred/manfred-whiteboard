# Manfred Whiteboard

A real-time collaborative whiteboard on an infinite canvas — sticky notes, shapes,
magnetic connectors and freehand ink, synchronised between tabs and people through
CRDTs. Local-first: every edit lands instantly and reconciles without conflicts.

## What's in it

- **Infinite canvas** — pan and zoom from 10% to 500% over a dot grid, by pointer,
  spacebar-drag or keyboard.
- **Board objects** — sticky notes with inline editing, rectangles and circles,
  dynamic Bézier connectors that re-anchor as their endpoints move, and a freehand pen.
- **Multiplayer** — live cursors, presence badges and conflict-free sync over Yjs and
  `y-websocket`.
- **Offline resilience** — `y-indexeddb` keeps the board through a lost connection.

## Quick start

```bash
npm install
npm run server   # Yjs relay on ws://localhost:4444 — start this first for multiplayer
npm run dev      # Vite dev server
```

Open the app twice in separate windows to see it sync. Boards are addressed by URL
hash: `http://localhost:5173/#room=sprint-planning`. Without a `room` parameter you
land on `default-room`.

`VITE_WS_URL` overrides the relay endpoint (default `ws://localhost:4444`, which must
match the port `server/ws-server.mjs` listens on).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run server` | Yjs websocket relay (`PORT` to change the port) |
| `npm run build` | typecheck + production build |
| `npm run lint` | ESLint (includes `jsx-a11y`) |
| `npm run typecheck` | `tsc`, no emit |
| `npm run test` | Vitest (watch) |
| `npm run test:run` | Vitest once |
| `npm run test:coverage` | Vitest with coverage |
| `npm run coverage:check` | coverage ratchet gate |
| `npm run test:e2e` | Playwright — builds, previews and boots the relay first |
| `AXE_ENFORCE=1 npm run test:e2e` | make the axe sweep merge-blocking (CI does this) |

## Keyboard

The canvas is operable without a pointer. Tab to it, then:

| Key | Action |
| --- | --- |
| Arrow keys | Pan (hold Shift for a larger step) |
| `+` / `-` | Zoom around the canvas centre |
| `0` | Reset zoom to 100% |
| `V` `H` `S` `R` `C` `L` `P` `E` | Select, pan, sticky, rectangle, circle, connector, pen, eraser |

The toolbar follows the ARIA APG toolbar pattern: one tab stop, arrow keys and
Home/End move between tools, and moving focus never changes the active tool.

## Architecture

```
src/
  lib/          coordinate maths, connector anchors, stroke smoothing,
                keyboard viewport mapping, Yjs provider   ← pure, unit-tested
  components/
    Canvas/     viewport, dot grid, element and SVG layers, cursors
    UI/         toolbar, top nav, zoom controls, presence
  types/        shared board element types + the Yjs document schema
server/         ws-server.mjs — minimal y-websocket relay for local dev
```

Logic lives in `src/lib` as pure functions so it can be tested without rendering the
canvas; components stay thin around it.

## Testing

Vitest and Testing Library for units and components, Playwright for end-to-end —
including a multi-tab spec that drives two browser contexts against one room and
proves elements, text and presence cross the relay. The axe sweep runs on every E2E
pass and blocks CI on new violations.

See `AGENTS.md` for the development rhythm and the TDD rules this repo works to.
