# Collaborative Whiteboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-performance, real-time collaborative whiteboard ("Manfred Whiteboard") inspired by Miro/Mural with sticky notes, shapes, dynamic connectors, freehand drawing, and multiplayer cursor presence.

**Architecture:** Hybrid SVG + HTML DOM canvas with CSS 2D Matrix transformations, backed by Yjs CRDTs (`y-websocket` + `y-indexeddb`) for conflict-free multi-user synchronization and offline resilience.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Yjs, y-websocket, y-indexeddb, Lucide Icons, Vitest, Playwright, Vercel.

**Spec:** [`docs/superpowers/specs/2026-09-17-collaborative-whiteboard-design.md`](file:///Users/jens.wedin/Sandbox/Code/manfred-whiteboard/docs/superpowers/specs/2026-09-17-collaborative-whiteboard-design.md)

## Global Constraints

- Must follow Studio Manfred way-of-working (`docs/bootstrap/ways-of-working.md`) and stack conventions (`docs/bootstrap/stack-and-conventions.md`).
- Strict Red/Green/Refactor TDD on all core logic and geometry functions before implementing features.
- Infinite canvas coordinates must strictly separate Screen Space from World Space.
- Zoom range strictly clamped between `0.1x` (10%) and `5.0x` (500%).
- Realtime sync must use Yjs CRDTs with room ID derived from URL hash (e.g. `/#room=my-room`).
- Zero data loss: local changes cached in `y-indexeddb` alongside `y-websocket`.

---

## Tasks

### Task 1: Project Scaffolding & Dependency Setup

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `.npmrc` (wired to GITHUB_TOKEN for Manfred design system)

**Interfaces:**
- Produces: Working React 19 + Vite app that passes `npm run typecheck` and `npm run build`.

- [ ] **Step 1: Write `package.json` with project scripts and dependencies**
  Include `react`, `react-dom`, `yjs`, `y-websocket`, `y-indexeddb`, `lucide-react`, `clsx`, `tailwind-merge`, `@tailwindcss/vite`, `tailwindcss`, `typescript`, `vite`, `vitest`, `@testing-library/react`.
- [ ] **Step 2: Copy configuration files from `scratch/manfred-bootstrap/starter`**
  Ensure `.npmrc`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `index.html` are configured.
- [ ] **Step 3: Run `npm install` with environment token**
  Run: `GITHUB_TOKEN=$(gh auth token) npm install`
- [ ] **Step 4: Verify build and typecheck**
  Run: `npm run typecheck && npm run build`
- [ ] **Step 5: Commit**
  `git add -A && git commit -m "chore: scaffold React 19 + Vite + Tailwind v4 project"`

---

### Task 2: Core Coordinate Math & Viewport Engine

**Files:**
- Create: `src/lib/coordinates.ts`
- Test: `test/coordinates.test.ts`

**Interfaces:**
- Produces:
  - `screenToWorld(screenPoint: Point, viewport: Viewport): Point`
  - `worldToScreen(worldPoint: Point, viewport: Viewport): Point`
  - `zoomAtPoint(currentViewport: Viewport, focalScreenPoint: Point, zoomDelta: number): Viewport`
  - `clampZoom(zoom: number): number`

- [ ] **Step 1: Write failing tests for coordinate math**
  Cover 1.0x zoom, pan offsets, 2.0x zoom, 0.5x zoom, focal-point zooming, and zoom clamping between 0.1x and 5.0x.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run test/coordinates.test.ts`
  Expected: FAIL with "cannot find module"
- [ ] **Step 3: Implement minimal coordinate transformations**
  Write pure functions in `src/lib/coordinates.ts`.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run test/coordinates.test.ts`
- [ ] **Step 5: Commit**
  `git add -A && git commit -m "feat(math): add coordinate transformations with test coverage"`

---

### Task 3: Yjs CRDT Data Model & Synchronization Provider

**Files:**
- Create: `src/types/whiteboard.ts`
- Create: `src/lib/yjs-provider.ts`
- Test: `test/crdt-sync.test.ts`

**Interfaces:**
- Produces:
  - Type definitions: `BoardElement`, `StickyElement`, `ShapeElement`, `ConnectorElement`, `DrawingElement`, `Viewport`, `UserAwareness`
  - `initWhiteboardDoc(roomName: string, wsUrl?: string): { doc: Y.Doc, elementsMap: Y.Map<BoardElement>, elementOrder: Y.Array<string>, provider: WebsocketProvider, indexeddbProvider: IndexeddbPersistence, awareness: Awareness }`

- [ ] **Step 1: Write failing CRDT sync tests**
  Create two `Y.Doc` instances, apply local changes on doc A, exchange update vectors, verify doc B converges to exact state. Test create, update position/text, delete, and z-index reordering.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run test/crdt-sync.test.ts`
- [ ] **Step 3: Implement Yjs provider and schema helper**
  Implement in `src/types/whiteboard.ts` and `src/lib/yjs-provider.ts`.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run test/crdt-sync.test.ts`
- [ ] **Step 5: Commit**
  `git add -A && git commit -m "feat(crdt): implement Yjs schema and synchronization provider"`

---

### Task 4: Dynamic Connector Anchor Geometry Engine

**Files:**
- Create: `src/lib/connector-math.ts`
- Test: `test/connector-math.test.ts`

**Interfaces:**
- Produces:
  - `getAnchorPosition(element: BaseElement, anchor: AnchorPosition): Point`
  - `calculateBezierPath(start: Point, end: Point, fromAnchor: AnchorPosition, toAnchor: AnchorPosition): { pathData: string, angle: number }`

- [ ] **Step 1: Write failing tests for connector geometry**
  Verify 4 anchor positions for arbitrary rectangles and test cubic Bézier control points + arrow rotation angle.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run test/connector-math.test.ts`
- [ ] **Step 3: Implement anchor point and Bézier curve calculation**
  Write pure geometry functions in `src/lib/connector-math.ts`.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run test/connector-math.test.ts`
- [ ] **Step 5: Commit**
  `git add -A && git commit -m "feat(geometry): add dynamic connector anchor math with tests"`

---

### Task 5: Infinite Canvas Viewport & Pan/Zoom Navigation

**Files:**
- Create: `src/components/Canvas/CanvasViewport.tsx`
- Create: `src/components/Canvas/DotGrid.tsx`
- Create: `src/components/UI/ZoomControls.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `coordinates.ts`
- Produces: Smooth pan (Spacebar/Middle click) and cursor-focal zoom (mouse wheel / trackpad pinch) with dot grid backdrop.

- [ ] **Step 1: Create DotGrid SVG background**
  Render subtle infinite dot pattern shifting with `viewport.x` and `viewport.y`.
- [ ] **Step 2: Build `CanvasViewport` with pointer event listeners**
  Handle spacebar drag, middle mouse drag, wheel zooming, and trackpad pinch.
- [ ] **Step 3: Build `ZoomControls` floating widget**
  Provide Zoom In, Zoom Out, Zoom to 100%, and Zoom to Fit buttons.
- [ ] **Step 4: Verify in browser**
  Ensure panning and zooming feels responsive at 60fps.
- [ ] **Step 5: Commit**
  `git add -A && git commit -m "feat(canvas): implement infinite viewport navigation and dot grid"`

---

### Task 6: Sticky Notes & Shapes (DOM Layer with Inline Editing)

**Files:**
- Create: `src/components/Canvas/StickyNote.tsx`
- Create: `src/components/Canvas/ShapeItem.tsx`
- Create: `src/components/Canvas/SelectionOverlay.tsx`
- Modify: `src/components/Canvas/CanvasViewport.tsx`

**Interfaces:**
- Consumes: `BoardElement`, Yjs `elementsMap`
- Produces: Draggable, selectable, resizable sticky notes with auto-focusing inline textarea and pastel color switching.

- [ ] **Step 1: Implement `StickyNote` component**
  Render note with pastel colors, double-click inline text editing, and 4 anchor indicators.
- [ ] **Step 2: Implement `ShapeItem` component**
  Render rectangle and circle SVG/DOM elements with customizable fill/stroke.
- [ ] **Step 3: Implement selection and drag handling**
  Support single-select, multi-select bounding box, drag-to-move, and delete via `Backspace`/`Delete`.
- [ ] **Step 4: Write component test for StickyNote editing**
  Run: `npx vitest run test/StickyNote.test.tsx`
- [ ] **Step 5: Commit**
  `git add -A && git commit -m "feat(elements): implement sticky notes and shapes with inline editing"`

---

### Task 7: Dynamic Connectors & Freehand Pen (SVG Layers)

**Files:**
- Create: `src/components/Canvas/ConnectorLayer.tsx`
- Create: `src/components/Canvas/DrawingLayer.tsx`
- Modify: `src/components/Canvas/CanvasViewport.tsx`

**Interfaces:**
- Consumes: `connector-math.ts`, `ConnectorElement`, `DrawingElement`
- Produces: SVG layer rendering arrows between shapes/notes that stretch dynamically when dragged, and smooth freehand brush strokes.

- [ ] **Step 1: Implement connector drag tool**
  Clicking an anchor on element A and dragging to element B creates a live connector entry in Yjs.
- [ ] **Step 2: Implement `ConnectorLayer`**
  Renders all connectors with dynamic cubic Bézier paths and SVG arrow markers.
- [ ] **Step 3: Implement freehand pen tool & `DrawingLayer`**
  Pointer down/move/up records world coordinates and produces smoothed SVG path data.
- [ ] **Step 4: Commit**
  `git add -A && git commit -m "feat(canvas): add dynamic connectors and freehand pen layers"`

---

### Task 8: Multiplayer Awareness & Live Collaborative Cursors

**Files:**
- Create: `src/components/Canvas/MultiplayerCursors.tsx`
- Create: `src/components/UI/ActiveUsers.tsx`
- Modify: `src/components/Canvas/CanvasViewport.tsx`

**Interfaces:**
- Consumes: `y-websocket/awareness`
- Produces: Throttled live cursor trails with collaborator name tags and colored selection outlines.

- [ ] **Step 1: Wire awareness broadcasting on pointermove**
  Convert mouse coordinates to world space, throttle to 30ms, and broadcast via awareness.
- [ ] **Step 2: Implement `MultiplayerCursors`**
  Render animated SVG/DOM cursors with peer colors and name labels.
- [ ] **Step 3: Implement `ActiveUsers` top bar list**
  Display presence pill badges for all currently connected collaborators.
- [ ] **Step 4: Commit**
  `git add -A && git commit -m "feat(multiplayer): add real-time cursors and presence list"`

---

### Task 9: Floating Toolbar, Top Navigation, Undo/Redo & Export

**Files:**
- Create: `src/components/UI/Toolbar.tsx`
- Create: `src/components/UI/TopNav.tsx`
- Create: `src/lib/export.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: Miro-style left floating tool dock (Select, Pan, Sticky, Rect, Circle, Connector, Pen, Eraser, Palette), Y.UndoManager integration (`Cmd+Z`, `Cmd+Shift+Z`), and export to PNG / JSON.

- [ ] **Step 1: Implement glassmorphic `Toolbar`**
  Tool selection shortcuts (`V`, `H`, `S`, `R`, `O`, `C`, `P`, `E`), color picker, and active tool indicators.
- [ ] **Step 2: Wire `Y.UndoManager`**
  Enable undo/redo buttons and keyboard shortcuts.
- [ ] **Step 3: Implement board export (PNG & JSON)**
  Export board content as clean SVG/PNG image download or JSON backup.
- [ ] **Step 4: Commit**
  `git add -A && git commit -m "feat(ui): add floating toolbar, top navigation, undo/redo, and export"`

---

### Task 10: WebSocket Server & Playwright E2E Multi-Tab Verification

**Files:**
- Create: `server/ws-server.mjs`
- Create: `e2e/collaboration.spec.ts`

**Interfaces:**
- Produces: Standalone WebSocket server script and end-to-end automated multi-client sync test.

- [ ] **Step 1: Create lightweight WebSocket server**
  Using `y-websocket/bin/utils` or native `ws`. Add script `"server": "node server/ws-server.mjs"`.
- [ ] **Step 2: Write Playwright E2E multi-tab test**
  Open two browser contexts on `http://localhost:5173/#room=e2e-test`, create a sticky note in Tab 1, assert it appears in Tab 2 with cursor movement.
- [ ] **Step 3: Run E2E test**
  Run: `npm run test:e2e`
- [ ] **Step 4: Commit**
  `git add -A && git commit -m "test(e2e): add multiplayer sync verification with Playwright"`

---

### Task 11: GitHub & Vercel Deployment Setup

**Files:**
- Modify: `vercel.json`
- Modify: `README.md`

- [ ] **Step 1: Configure `vercel.json` for client-side routing & build output**
- [ ] **Step 2: Create GitHub repository under Studio-Manfred or user account**
  Run: `gh repo create manfred-whiteboard --source=. --remote=origin --push --private`
- [ ] **Step 3: Link Vercel project**
  Run: `vercel link --yes`
- [ ] **Step 4: Commit and push**
  `git push -u origin main`
