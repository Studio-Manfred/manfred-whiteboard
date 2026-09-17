# Design Specification: Real-Time Collaborative Whiteboard ("Manfred Whiteboard")

**Date:** 2026-09-17  
**Status:** Approved by User  
**Target Platform:** Web (Chromium, Firefox, Safari)  
**Harness:** Vite + React + TypeScript + Vanilla CSS + Yjs

---

## 1. Executive Summary & Goals

The goal of this project is to build a modern, high-performance, real-time collaborative whiteboard application inspired by tools like Miro and Mural. It enables distributed teams or individuals to brainstorm, organize thoughts, sketch diagrams, and visually communicate on an infinite canvas with zero-latency local feedback and conflict-free multi-user synchronization.

### Key Goals
- **Infinite Zoomable & Pannable Canvas:** Smooth 60fps pan and zoom (10% to 500%) with an infinite subtle dot grid.
- **Core Miro Object Suite:** Sticky notes with inline text editing and pastel palettes, geometric shapes (rectangles, circles), containers/frames, dynamic magnetic connectors/arrows, and freehand drawing.
- **Real-Time Multiplayer Collaboration:** CRDT-based synchronization via Yjs and `y-websocket`, featuring live colored cursor presence and user identification badges.
- **Offline & Local Resilience:** Local persistence with `y-indexeddb` to ensure zero data loss during network hiccups.

---

## 2. System Architecture

```
+-----------------------------------------------------------------------+
|                              Browser                                  |
|                                                                       |
|  +-----------------------+     +-----------------------------------+  |
|  |   UI Controls Layer   |     |       Canvas Viewport (World)     |  |
|  | TopNav / Toolbar /    |     |  - Dot Grid Background            |  |
|  | Zoom Controls         |     |  - SvgConnectorLayer (Bezier)     |  |
|  +-----------+-----------+     |  - SvgDrawingLayer (Pen strokes)  |  |
|              |                 |  - ElementLayer (Notes, Shapes)   |  |
|              v                 |  - MultiplayerCursorsLayer        |  |
|  +-----------------------+     +-----------------+-----------------+  |
|  |  React State Hooks    |                       |                    |
|  |  (Selection, Active   |<----------------------+                    |
|  |   Tool, Viewport)     |                                            |
|  +-----------+-----------+                                            |
|              |                                                        |
|              v                                                        |
|  +-----------------------------------------------------------------+  |
|  |                      Yjs Document (`Y.Doc`)                     |  |
|  |  - `elements` (Y.Map<BoardElement>)                             |  |
|  |  - `elementOrder` (Y.Array<string>)                             |  |
|  |  - Awareness Protocol (Cursors, Selections, User Info)          |  |
|  +--------------------+----------------------------+---------------+  |
+-----------------------|----------------------------|------------------+
                        | (CRDT updates)             | (IndexedDB)
                        v                            v
             +--------------------+       +--------------------+
             |    y-websocket     |       |    y-indexeddb     |
             |   Backend Server   |       | Local Browser DB   |
             +--------------------+       +--------------------+
```

---

## 3. Canvas Rendering Engine: Hybrid SVG + HTML DOM

The whiteboard uses a **Hybrid SVG + HTML DOM** rendering approach with CSS 2D Matrix transformations:

### 3.1 Coordinate Spaces & Transformations
- **Screen Space:** Pixel coordinates relative to the browser viewport `(screenX, screenY)`.
- **World Space:** Infinite coordinate system `(worldX, worldY)`.
- **Viewport State:** `{ x: number, y: number, zoom: number }`
  - Screen to World: `worldX = (screenX - viewport.x) / viewport.zoom`
  - World to Screen: `screenX = worldX * viewport.zoom + viewport.x`
- **Container Transform:** Rendered on `#canvas-world` via `transform: translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` with `transform-origin: 0 0`.

### 3.2 Layer Separation
1. **Grid Background:** High-performance SVG dot pattern styled with CSS background-position and background-size linked to viewport offset and zoom.
2. **Frames Layer:** Background container rectangles with title headers for categorizing elements.
3. **SVG Connector Layer:** Renders cubic Bézier curves connecting element anchors. Recalculates dynamically when connected elements move.
4. **SVG Drawing Layer:** Renders freehand pen brush strokes smoothed using Catmull-Rom or Bézier approximations.
5. **DOM Element Layer:** Sticky notes and shapes rendered as absolute HTML elements. Enables native text selection, browser spellcheck, inline `contentEditable` or `<textarea>` editing, and crisp typography.
6. **Multiplayer Cursors Layer:** Renders collaborator cursors, name badges, and active element selection rings.
7. **Overlay Layer (Screen Space):** Marquee drag selection box, floating toolbars, zoom controls, and modals.

---

## 4. Data Model & CRDT Schema

### 4.1 BoardElement Types
```typescript
export type ElementType = 'sticky' | 'shape' | 'frame' | 'connector' | 'drawing';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  text: string;
  color: string; // Hex code from curated pastel palette
  fontSize: number;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'circle';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  text?: string;
}

export interface FrameElement extends BaseElement {
  type: 'frame';
  title: string;
  fillColor: string;
}

export interface ConnectorElement extends BaseElement {
  type: 'connector';
  fromId: string;
  toId: string;
  fromAnchor: 'top' | 'right' | 'bottom' | 'left';
  toAnchor: 'top' | 'right' | 'bottom' | 'left';
  strokeColor: string;
  strokeWidth: number;
  style: 'curved' | 'straight';
}

export interface DrawingElement extends BaseElement {
  type: 'drawing';
  points: Array<{ x: number; y: number }>;
  strokeColor: string;
  strokeWidth: number;
}

export type BoardElement =
  | StickyElement
  | ShapeElement
  | FrameElement
  | ConnectorElement
  | DrawingElement;
```

### 4.2 Yjs Data Structures
- **`elements: Y.Map<BoardElement>`**: Dictionary mapping `element.id` to element state. Provides conflict-free concurrent editing.
- **`elementOrder: Y.Array<string>`**: Array of element IDs defining stacking order (`zIndex`).
- **`awareness`**: Ephemeral state:
  ```typescript
  interface UserAwareness {
    user: {
      id: string;
      name: string;
      color: string;
    };
    cursor: { x: number; y: number } | null;
    selection: string[]; // List of selected element IDs
  }
  ```

---

## 5. Interaction Modes & User Experience

### 5.1 Tool Set
| Tool | Shortcut | Behavior |
| :--- | :--- | :--- |
| **Select** | `V` | Click to select; `Shift+Click` or drag box to multi-select; drag to move; resize handles to resize; double-click to edit text. |
| **Pan** | `H` / `Space` | Drag anywhere to translate viewport; mouse wheel / trackpad pinch to zoom. |
| **Sticky Note** | `S` | Click canvas to instantiate a 200x200 sticky note; opens text editing immediately. |
| **Rectangle** | `R` | Drag to draw rectangle shape. |
| **Circle** | `O` | Drag to draw circle/ellipse shape. |
| **Frame** | `F` | Drag to create a titled grouping container. |
| **Connector** | `C` | Click on an anchor point and drag to another element's anchor to establish dynamic arrow. |
| **Pen** | `P` | Freehand drawing with smoothed curves. |
| **Eraser** | `E` | Click or drag across elements to delete them. |

### 5.2 Dynamic Connector Anchor Mechanics
- Each sticky note and shape exposes 4 cardinal anchor points:
  - Top: `(x + width / 2, y)`
  - Right: `(x + width, y + height / 2)`
  - Bottom: `(x + width / 2, y + height)`
  - Left: `(x, y + height / 2)`
- When an attached object is dragged, the connector dynamically updates its cubic Bézier control points:
  `M fromX fromY C cp1X cp1Y, cp2X cp2Y, toX toY` with an SVG arrowhead marker.

---

## 6. Visual Design System

- **Backdrop:** Light neutral gray `#F8F9FA` with subtle dot grid `#E2E8F0`.
- **UI Shell:** Floating glassmorphic dock with `backdrop-filter: blur(16px)` and soft border `#E2E8F0`.
- **Sticky Note Palette:**
  - Sunbeam Yellow: `#FFF9B1`
  - Mint Frost: `#D4F0F0`
  - Coral Pink: `#FFD1DC`
  - Sky Blue: `#CCE2FF`
  - Lavender: `#E8D7FF`
  - Peach Cream: `#FFE5D4`
- **Typography:** Modern clean sans-serif (Inter/system sans-serif), crisp scaling at all zoom levels.

---

## 7. Error Handling & Edge Cases

1. **Orphaned Connectors:** If an element referenced by `fromId` or `toId` is deleted by any peer, the connector is automatically purged from `elements`.
2. **Offline Reconnection:** Yjs buffers local updates in memory and IndexedDB. On network reconnect, state syncs automatically via CRDT delta exchange.
3. **Concurrent Edits on Same Note:** Yjs LWW ensures all clients converge to the identical state without crashing or diverging.
4. **Extreme Zoom Clamping:** Viewport zoom is clamped to `[0.1, 5.0]` to avoid zero-division or graphical clipping.

---

## 8. Verification & Testing Plan

### 8.1 Automated Tests (Vitest)
- **`coordinate-math.test.ts`**: Verifies screen-to-world and world-to-screen matrix transforms across arbitrary zoom and pan values.
- **`connector-geometry.test.ts`**: Validates Bézier control point calculations and distance metrics between anchor points.
- **`crdt-sync.test.ts`**: Simulates two independent `Y.Doc` peers exchanging updates to verify eventual consistency for create, move, update, and delete actions.

### 8.2 Manual End-to-End Verification
- Open two separate browser tabs with the same room URL `#room=test`.
- Verify live cursor movements, sticky note text editing, shape creation, connector dragging, and undo/redo operations across both windows.
