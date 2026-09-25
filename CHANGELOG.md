# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A briefing convention for dispatched roles: one `docs/context/STU-NNN.md` per ticket
  holding the approved design, the contract agents code against, verified repo facts and
  an append-only Traps section, so a brief points at one reviewed source instead of
  restating it five times (STU-952).

- Fill patterns for shapes — five retro 1-bit mono patterns (`hatch`, `crosshatch`, `dots`,
  `checker`, `scanline`) drawn in the shape's border colour over its fill colour. Geometry
  tested in `src/lib/fill-patterns.ts` and feeds both canvas and export renderers. Picker
  chips are tiled SVG previews; shape labels get a halo in the shape's fill to sit legibly
  over dense ink (STU-925).

- Text objects — bare text on an infinite canvas, no fill and no border. The user sets
  the width; height is derived from the content and follows as they type. Width is
  resizable via east and west handles; height is read-only. One style per object:
  `text`, `fontSize`, optional `fontFamily` and `textAlign`, optional `textColor`. Text
  objects get the same text colour control (colour picker in properties bar) that sticky
  notes and shape labels now support, reaching all three from the same control. Creating
  a text object enters edit mode immediately. Deleting all text (including a paste of
  whitespace) or pressing Escape on a never-typed object removes it. Text layout is
  computed by a single pure module (`src/lib/text-layout.ts`) that the canvas and export
  both call, ensuring they wrap identically (STU-953).

- A text colour control in the properties bar, reaching text objects, sticky-note text
  and shape labels — all three were previously locked to `slate-800` (STU-953).

- Freehand strokes are full objects: they resize by their handles (scaling the ink, not
  just its bounding box) and take part in stack order alongside notes and shapes. Colour
  and thickness already worked (STU-871).

- Pen-like ink: freehand strokes thicken when drawn slowly and thin when drawn fast, via
  `perfect-freehand`. A stylus's real pressure is used where reported, and simulated from
  velocity otherwise. Strokes drawn before this keep their uniform width (STU-870).

- Sticky notes with double-click inline editing, rectangle and circle shapes, and a
  selection overlay.
- Dynamic Bézier connectors and a freehand pen, with stroke smoothing extracted to
  `src/lib/stroke-path.ts`.
- Multiplayer cursors and an active-user presence list driven by Yjs awareness.
- Floating tool toolbar and top navigation bar.
- Keyboard operation of the canvas viewport: arrow keys pan, `+`/`-` zoom, `0` resets.
- Text alignment — left, centre, right — for notes and shape labels, in the properties
  bar and carried through to the editors and the SVG export (STU-866).
- Stack order in the properties bar: bring to front, bring forward, send backward, send to
  back, applied across a selection in one undo step (STU-865).
- Floating properties bar beside the selection: fill, border colour, thickness, text size
  and font for notes and shapes; colour, thickness and arrowheads (none / start / end /
  both) for arrows; colour and thickness for ink. Applies across a multi-selection in one
  undo step (STU-864).
- Arrows are drawn by dragging from a connection dot: a preview follows the pointer,
  every element shows its dots while an arrow is in flight, and coming near one snaps
  the preview to it. Release on a snap to draw it, Escape to abandon. Dropping anywhere
  over an element connects to its nearest dot. Keyboard route kept, since dragging is
  pointer-only (STU-863).
- Resize sticky notes and shapes by dragging any of eight handles — four corners and
  four edges — with shift to preserve proportions, a minimum size, and full arrow-key
  support from the keyboard (STU-860).
- Board export to PNG and JSON from the top bar. The board is redrawn as a standalone
  SVG and rasterised at 2x; the JSON backup is versioned and z-ordered (STU-854).
- Marquee selection: drag across empty canvas to select everything the rubber band
  touches, shift-click to add or remove, and drag any member to move the whole group.
  Delete, recolour and group moves are each a single undo step (STU-857).
- Colour picker in the toolbar: recolours the selection, or sets the colour of the next
  sticky note when nothing is selected. Shapes get fill and border separately, and can be
  emptied back to transparent (STU-855).
- Undo and redo buttons in the top bar, disabled when the history is empty, driven by
  the same `useUndoRedo` hook as the keyboard shortcuts (STU-856).
- Minimal y-websocket relay (`server/ws-server.mjs`) for local multiplayer.
- Multi-tab Playwright spec covering element, text and presence sync across two
  browser contexts.
- Unit and component tests across the canvas and UI layer, an App integration test
  driving the real component tree against an in-memory Yjs document, and a
  `PointerEvent` polyfill in the test setup (jsdom has none).
- `README.md` (including deployment setup and the single-player caveat) and this
  changelog.

### Changed

- The toolbar's colour palette has moved to the properties bar, which edits what is
  selected. With no palette to pre-set a colour, the last fill applied becomes the colour
  of the next sticky note.

- Drawing an arrow no longer means clicking one dot and then another, with no feedback
  in between; clicking an element's body no longer completes a half-drawn connector.

- The shape tools — rectangle, circle — now share one Shape button with a dropdown flyout,
  since the toolbar at 393px viewport width has no room for a ninth separate button. The
  flyout opens on click and closes on blur or when a shape is selected; arrow keys move
  between the two shapes and Escape closes it. Shape shortcuts `R` and `C` still work and
  are shown as titles on the flyout buttons (STU-953).

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

- A freehand stroke could be selected and resized but not moved: its points are world
  coordinates and its SVG `viewBox` follows its bounding box, so moving the box shifted
  both by the same amount and cancelled out — the box walked away while the ink stayed
  put. Moving a stroke now carries its points with it (STU-872).

- Resize handles were unclickable inside layers that disable pointer events, so resizing a
  freehand stroke did nothing and silently deselected it. The handles now re-enable pointer
  events for themselves.

- Shapes had no shadow at all, so they sat flat while notes floated. Notes and shapes now
  share one elevation model, and a shape's shadow follows its real outline rather than a
  box around it — a rectangular shadow would be wrong for a circle or a transparent fill.
- An element only *appeared* to lift while dragging, because it was really showing its
  selected shadow: there was no drag state in React at all. Dragging now lifts an element
  properly, on the first actual movement rather than on the press, so a plain click to
  select no longer makes it jump.
- The selected arrow's glow had never rendered: it was a CSS value passed as a class name,
  which Tailwind generates nothing for.

- Text in a shape sat against its border, and a thick border made it worse, because the
  stroke is drawn half inside the bounds. Notes and shapes now share one padding rule,
  and a shape's inset grows with its border thickness. The SVG export follows the same
  rule, where it previously used a constant of its own.

- On-screen stacking ignored `zIndex` entirely: notes were painted as one group above
  shapes as another, so a shape could never sit above a note, while hit-testing and the
  SVG export both read `zIndex`. The eraser could therefore delete something other than
  what was visibly on top. All three now agree (STU-865).

- Connectors and pen strokes could not be clicked, so they could not be selected or
  deleted. Their hit areas carried `pointer-events-stroke`, which is not a Tailwind
  utility and generated no CSS, leaving them to inherit `pointer-events: none` from the
  SVG layer (STU-861).
- Connection anchors were unusable once resize handles existed: the handles straddle the
  edge the anchors sat on and appear on selection, so they swallowed the click. Anchors
  now sit clear of them, and no longer let a press through to the element beneath
  (STU-861).

- Multiplayer never connected: the client dialled `ws://localhost:1234` while the relay
  listens on `4444`, so every tab silently fell back to its local IndexedDB copy. The
  endpoint now defaults to the relay's port and can be overridden with `VITE_WS_URL`.
- Dragging an element moved its top-left corner onto the cursor instead of moving it by
  the drag delta, because the drag origin was the element's position rather than the
  pointer's.
- Room name chip failed WCAG AA contrast (4.34:1 against the 4.5:1 required at 12px).
- A deployed build with no `VITE_WS_URL` fell back to `ws://localhost:4444`, so every
  visitor's browser tried to reach port 4444 on their own machine and retried forever.
  The localhost fallback is now development-only; a built app with no relay configured
  opens no socket at all and runs local-only.
