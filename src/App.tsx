import React, { useState, useEffect, useRef, useCallback } from 'react'
import type * as Y from 'yjs'
import { CanvasViewport, type CanvasTool } from './components/Canvas/CanvasViewport'
import { StickyNote } from './components/Canvas/StickyNote'
import { ShapeItem } from './components/Canvas/ShapeItem'
import { TextItem } from './components/Canvas/TextItem'
import { ConnectorLayer } from './components/Canvas/ConnectorLayer'
import { DrawingLayer } from './components/Canvas/DrawingLayer'
import { DrawingItem } from './components/Canvas/DrawingItem'
import { MultiplayerCursors } from './components/Canvas/MultiplayerCursors'
import { SelectionOverlay } from './components/Canvas/SelectionOverlay'

import { Toolbar } from './components/UI/Toolbar'
import { TopNav } from './components/UI/TopNav'
import { ZoomControls } from './components/UI/ZoomControls'
import { initWhiteboardConnection, getRoomFromUrl, type WhiteboardConnection } from './lib/yjs-provider'
import { screenToWorld, type Viewport, type Point } from './lib/coordinates'
import {
  createStickyElement,
  createShapeElement,
  createDrawingElement,
  createConnectorElement,
  createTextElement,
} from './lib/element-factories'
import { partitionElements, findElementAt } from './lib/board-selectors'
import { elementsInMarquee, rectFromPoints } from './lib/marquee'
import { boardBounds, boardToJson, boardToSvg } from './lib/board-export'
import type { InkPoint } from './lib/ink'
import { translatePoints } from './lib/scale-points'
import { resizePatchFor, resizeRect, type ResizeHandle } from './lib/resize'
import { findSnapTarget, type AnchorCandidate } from './lib/connector-drag'
import { getAnchorPosition } from './lib/connector-math'
import { boardFilename, downloadBlob, svgToPngBlob } from './lib/download'
import { colorPatchFor } from './lib/element-colors'
import { addElement, patchElement, removeElements } from './lib/board-mutations'
import { toolForShortcut } from './lib/tool-shortcuts'
import { generateUser } from './lib/user-identity'
import { useUndoRedo } from './hooks/useUndoRedo'
import { PropertiesBar } from './components/UI/PropertiesBar'
import { selectionBounds } from './lib/context-bar'
import { orderedIds, restack, zIndexPatches, type StackCommand } from './lib/stacking'
import {
  patchArrowheads,
  supportsProperty,
  type Arrowheads,
} from './lib/element-style'
import type { FillPattern } from './lib/fill-patterns'
import type { FontFamily, TextAlign } from './types/whiteboard'
import type {
  BoardElement,
  UserAwareness,
  AnchorPosition,
  TextElement,
} from './types/whiteboard'

const localUser = generateUser()

export default function App() {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [activeTool, setActiveTool] = useState<CanvasTool>('select')
  const [elements, setElements] = useState<Map<string, BoardElement>>(new Map())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [remoteUsers, setRemoteUsers] = useState<UserAwareness[]>([])

  // Drawing state
  const [drawingPoints, setDrawingPoints] = useState<InkPoint[]>([])
  const isDrawing = useRef(false)

  /** An arrow being dragged out of an anchor. */
  const [connectorDrag, setConnectorDrag] = useState<{
    fromId: string
    fromAnchor: AnchorPosition
    pointer: Point
    snap: AnchorCandidate | null
  } | null>(null)

  /** The keyboard route to the same thing: activate one anchor, then another. */
  const [pendingAnchor, setPendingAnchor] = useState<{
    elementId: string
    anchor: AnchorPosition
  } | null>(null)

  // Drag state
  const dragState = useRef<{
    startWorld: Point
    /**
     * Where each dragged element started, so a group keeps its shape. A
     * stroke's points travel with it: they are world coordinates, and its svg
     * viewBox follows its box, so moving the box alone cancels out.
     */
    origins: Map<string, { x: number; y: number; points?: InkPoint[] }>
  } | null>(null)

  /** Ids currently being moved, so they can be shown lifted. */
  const [draggingIds, setDraggingIds] = useState<Set<string>>(new Set())

  /** Rubber-band selection in world coordinates; null when not dragging one. */
  const [marquee, setMarquee] = useState<{ start: Point; current: Point } | null>(null)

  const resizeState = useRef<{
    elementId: string
    handle: ResizeHandle
    /** The element's geometry when the drag started, so deltas stay absolute. */
    startRect: { x: number; y: number; width: number; height: number }
    startWorld: Point
  } | null>(null)

  const connectionRef = useRef<WhiteboardConnection | null>(null)
  const [undoManager, setUndoManager] = useState<Y.UndoManager | null>(null)
  // Null until the user picks one, so new notes keep their random pastel.
  const [defaultFill, setDefaultFill] = useState<string | null>(null)
  // The id of the text object *this tab* just created, so only that tab
  // opens it straight into edit mode. Must never be derived from shared
  // document data (e.g. `element.text === ''`) — every peer's `elementsMap`
  // sees the same freshly created empty element, and auto-editing it on
  // every client is what let one peer's click delete another peer's
  // in-progress object (STU-953 critical fix). This is local-only and does
  // not need to be cleared: it is compared by exact id, so it only ever
  // matches the one element it was set for.
  const [justCreatedTextId, setJustCreatedTextId] = useState<string | null>(null)
  const roomName = getRoomFromUrl()

  // ----------- CRDT Connection & Sync -----------
  useEffect(() => {
    const conn = initWhiteboardConnection(roomName)
    connectionRef.current = conn
    setUndoManager(conn.undoManager)

    // Set initial awareness
    if (conn.awareness) {
      conn.awareness.setLocalStateField('user', localUser)
      conn.awareness.setLocalStateField('cursor', null)
      conn.awareness.setLocalStateField('selection', [])
    }

    // Sync elements from CRDT to React state
    const syncElements = () => {
      const map = new Map<string, BoardElement>()
      conn.elementsMap.forEach((val, key) => {
        map.set(key, val)
      })
      setElements(map)
    }

    conn.elementsMap.observe(syncElements)
    syncElements()

    // Sync remote awareness
    const syncAwareness = () => {
      if (!conn.awareness) return
      const states: UserAwareness[] = []
      conn.awareness.getStates().forEach((state) => {
        if (state.user) {
          states.push(state as UserAwareness)
        }
      })
      setRemoteUsers(states.filter((u) => u.user.id !== localUser.id))
    }

    conn.awareness?.on('change', syncAwareness)
    syncAwareness()

    return () => {
      conn.elementsMap.unobserve(syncElements)
      conn.awareness?.off('change', syncAwareness)
      setUndoManager(null)
      conn.destroy()
    }
  }, [roomName])

  const { canUndo, canRedo, undo, redo } = useUndoRedo(undoManager)

  // ----------- Keyboard Shortcuts -----------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape') {
        setConnectorDrag(null)
        setPendingAnchor(null)
        return
      }

      const key = e.key.toLowerCase()
      const shortcutTool = toolForShortcut(key)

      if (shortcutTool) {
        setActiveTool(shortcutTool)
        return
      }

      // Delete selected elements
      if ((key === 'delete' || key === 'backspace') && selectedIds.size > 0) {
        const conn = connectionRef.current
        if (!conn) return
        removeElements(conn, selectedIds)
        setSelectedIds(new Set())
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds, undo, redo])

  // ----------- Element CRDT helpers -----------
  const updateElement = useCallback((id: string, partial: Partial<BoardElement>) => {
    const conn = connectionRef.current
    if (!conn) return
    patchElement(conn, id, partial)
  }, [])

  const createElement = useCallback((el: BoardElement) => {
    const conn = connectionRef.current
    if (!conn) return
    addElement(conn, el)
  }, [])

  /**
   * An emptied text object leaves nothing to see or select, so it goes —
   * whitespace-only text counts as empty too, since it is just as invisible
   * and just as impossible to click back into.
   */
  const updateTextElement = useCallback((element: TextElement, patch: Partial<TextElement>) => {
    const conn = connectionRef.current
    if (!conn) return

    if (patch.text !== undefined && patch.text.trim() === '') {
      removeElements(conn, [element.id])
      return
    }
    patchElement(conn, element.id, patch)
  }, [])

  // ----------- Canvas Pointer Handlers -----------
  const handleCanvasPointerDown = useCallback(
    (worldPoint: Point) => {
      // Empty canvas: start a rubber-band selection. A click with no drag ends
      // up as a zero-size marquee, which selects nothing — i.e. deselects.
      if (activeTool === 'select') {
        setSelectedIds(new Set())
        setPendingAnchor(null)
        setMarquee({ start: worldPoint, current: worldPoint })
        return
      }

      if (activeTool === 'sticky') {
        const sticky = createStickyElement(worldPoint, {
          zIndex: elements.size + 1,
          ...(defaultFill ? { color: defaultFill } : {}),
        })
        createElement(sticky)
        setSelectedIds(new Set([sticky.id]))
        setActiveTool('select')
        return
      }

      if (activeTool === 'text') {
        const text = createTextElement(worldPoint, { zIndex: elements.size + 1 })
        createElement(text)
        setSelectedIds(new Set([text.id]))
        setJustCreatedTextId(text.id)
        setActiveTool('select')
        return
      }

      if (activeTool === 'rectangle' || activeTool === 'circle') {
        const shape = createShapeElement(
          worldPoint,
          activeTool === 'circle' ? 'circle' : 'rectangle',
          { zIndex: elements.size + 1 }
        )
        createElement(shape)
        setSelectedIds(new Set([shape.id]))
        setActiveTool('select')
        return
      }

      if (activeTool === 'pen') {
        isDrawing.current = true
        setDrawingPoints([{ x: worldPoint.x, y: worldPoint.y }])
        return
      }

      if (activeTool === 'eraser') {
        const conn = connectionRef.current
        if (!conn) return
        const hitId = findElementAt(elements, worldPoint)
        if (hitId) removeElements(conn, [hitId])
      }
    },
    [activeTool, elements, createElement, defaultFill]
  )

  const handleCanvasPointerMove = useCallback(
    (worldPoint: Point, e: React.PointerEvent) => {
      // Broadcast cursor position
      const conn = connectionRef.current
      if (conn?.awareness) {
        conn.awareness.setLocalStateField('cursor', { x: worldPoint.x, y: worldPoint.y })
      }

      // Active drawing
      if (activeTool === 'pen' && isDrawing.current) {
        // A mouse reports a constant 0.5, which would draw a flat line, so only
        // a real stylus contributes pressure; otherwise it is simulated from
        // the speed of the stroke.
        const pressure = e.pointerType === 'pen' ? { p: e.pressure } : {}
        setDrawingPoints((prev) => [...prev, { x: worldPoint.x, y: worldPoint.y, ...pressure }])
        return
      }

      // Resize in progress — measured from where the drag began, not the last frame
      if (resizeState.current) {
        const { elementId, handle, startRect, startWorld } = resizeState.current
        const conn = connectionRef.current
        if (!conn) return

        const element = elements.get(elementId)
        if (!element) return

        const next = resizeRect(
          startRect,
          handle,
          { x: worldPoint.x - startWorld.x, y: worldPoint.y - startWorld.y },
          { preserveAspectRatio: e.shiftKey }
        )
        patchElement(conn, elementId, resizePatchFor(element, next))
        return
      }

      // An arrow is being dragged out of an anchor
      if (connectorDrag) {
        setConnectorDrag({
          ...connectorDrag,
          pointer: worldPoint,
          snap: findSnapTarget(elements, worldPoint, { excludeId: connectorDrag.fromId }),
        })
        return
      }

      // Rubber-band selection, updated live so the user sees what they will get
      if (marquee) {
        setMarquee({ start: marquee.start, current: worldPoint })
        const rect = rectFromPoints(marquee.start, worldPoint)
        setSelectedIds(new Set(elementsInMarquee(elements, rect)))
        return
      }

      // Drag move — every selected element travels together
      if (dragState.current) {
        const { startWorld, origins } = dragState.current

        // Lift on the first actual movement, not on the press: a plain click
        // to select should not make the element jump.
        if (draggingIds.size === 0) setDraggingIds(new Set(origins.keys()))
        const dx = worldPoint.x - startWorld.x
        const dy = worldPoint.y - startWorld.y

        const conn = connectionRef.current
        if (!conn) return

        // One transaction so a group move is a single undo step.
        conn.doc.transact(() => {
          origins.forEach((origin, id) => {
            patchElement(conn, id, {
              x: origin.x + dx,
              y: origin.y + dy,
              ...(origin.points ? { points: translatePoints(origin.points, dx, dy) } : {}),
            } as Partial<BoardElement>)
          })
        })
      }
    },
    [activeTool, marquee, elements, connectorDrag, draggingIds]
  )

  const handleCanvasPointerUp = useCallback(
    () => {
      // Finish drawing
      if (activeTool === 'pen' && isDrawing.current) {
        isDrawing.current = false
        if (drawingPoints.length > 2) {
          createElement(createDrawingElement(drawingPoints, { zIndex: elements.size + 1 }))
        }
        setDrawingPoints([])
        return
      }

      resizeState.current = null
      if (draggingIds.size > 0) setDraggingIds(new Set())

      // Land the arrow, or drop it if it never found a target.
      if (connectorDrag) {
        if (connectorDrag.snap) {
          createElement(
            createConnectorElement(
              {
                fromId: connectorDrag.fromId,
                fromAnchor: connectorDrag.fromAnchor,
                toId: connectorDrag.snap.elementId,
                toAnchor: connectorDrag.snap.anchor,
              },
              { zIndex: elements.size + 1 }
            )
          )
        }
        setConnectorDrag(null)
        return
      }

      // Finish the rubber band; the selection it produced stays put.
      if (marquee) {
        setMarquee(null)
        return
      }

      // Finish drag
      dragState.current = null
    },
    [activeTool, drawingPoints, elements, createElement, marquee, connectorDrag, draggingIds]
  )

  // ----------- Element event handlers -----------
  const handleElementSelect = useCallback((id: string, e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation()

    const additive = 'shiftKey' in e && e.shiftKey
    setSelectedIds((previous) => {
      if (!additive) return new Set([id])

      const next = new Set(previous)
      // Shift on an already-selected element takes it back out again.
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /** Where a pointer event sits in board coordinates. */
  const pointerWorld = useCallback(
    (e: React.PointerEvent) => screenToWorld({ x: e.clientX, y: e.clientY }, viewport),
    [viewport]
  )

  const handleDragStart = useCallback(
    (id: string, worldPoint: Point, e: React.PointerEvent) => {
      e.stopPropagation()
      const el = elements.get(id)
      if (!el) return

      // Dragging a member of a selection moves the whole selection; dragging
      // anything else moves just that element.
      const group = selectedIds.has(id) ? selectedIds : new Set([id])
      const origins = new Map<string, { x: number; y: number; points?: InkPoint[] }>()
      group.forEach((memberId) => {
        const member = elements.get(memberId)
        if (!member) return

        origins.set(memberId, {
          x: member.x,
          y: member.y,
          ...(member.type === 'drawing' ? { points: member.points } : {}),
        })
      })

      dragState.current = { startWorld: worldPoint, origins }
    },
    [elements, selectedIds]
  )

  // ----------- Connectors -----------
  const connectElements = useCallback(
    (fromId: string, fromAnchor: AnchorPosition, toId: string, toAnchor: AnchorPosition) => {
      createElement(
        createConnectorElement(
          { fromId, fromAnchor, toId, toAnchor },
          { zIndex: elements.size + 1 }
        )
      )
    },
    [elements, createElement]
  )

  const handleAnchorDragStart = useCallback(
    (id: string, anchor: AnchorPosition, e: React.PointerEvent) => {
      const el = elements.get(id)
      if (!el) return

      setPendingAnchor(null)
      setConnectorDrag({
        fromId: id,
        fromAnchor: anchor,
        pointer: getAnchorPosition(el, anchor),
        snap: null,
      })
      // Keep receiving moves even if the pointer leaves the small anchor.
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    },
    [elements]
  )

  /** Enter or Space on an anchor: pick a start, then pick an end. */
  const handleAnchorKeyActivate = useCallback(
    (id: string, anchor: AnchorPosition) => {
      if (pendingAnchor && pendingAnchor.elementId !== id) {
        connectElements(pendingAnchor.elementId, pendingAnchor.anchor, id, anchor)
        setPendingAnchor(null)
        return
      }

      setPendingAnchor({ elementId: id, anchor })
    },
    [pendingAnchor, connectElements]
  )

  // ----------- Resize -----------
  const handleResizeStart = useCallback(
    (id: string, handle: ResizeHandle, e: React.PointerEvent) => {
      const el = elements.get(id)
      if (!el) return

      resizeState.current = {
        elementId: id,
        handle,
        startRect: { x: el.x, y: el.y, width: el.width, height: el.height },
        startWorld: pointerWorld(e),
      }
    },
    [elements, pointerWorld]
  )

  const handleResizeByKeyboard = useCallback(
    (id: string, handle: ResizeHandle, delta: Point) => {
      const el = elements.get(id)
      const conn = connectionRef.current
      if (!el || !conn) return

      const next = resizeRect(
        { x: el.x, y: el.y, width: el.width, height: el.height },
        handle,
        delta
      )
      patchElement(conn, id, resizePatchFor(el, next))
    },
    [elements]
  )

  // ----------- Export -----------
  const handleExportJson = useCallback(() => {
    const blob = new Blob([boardToJson(elements)], { type: 'application/json' })
    downloadBlob(blob, boardFilename(roomName, 'json'))
  }, [elements, roomName])

  const handleExportPng = useCallback(async () => {
    const bounds = boardBounds(elements)
    try {
      const blob = await svgToPngBlob(boardToSvg(elements), bounds.width, bounds.height)
      downloadBlob(blob, boardFilename(roomName, 'png'))
    } catch (error) {
      // Nothing is downloaded; the board itself is untouched.
      console.error('Could not export the board as a PNG:', error)
    }
  }, [elements, roomName])

  // ----------- Styling the selection -----------
  const selectedElements = Array.from(selectedIds)
    .map((id) => elements.get(id))
    .filter((el): el is BoardElement => Boolean(el))

  /** Applies a patch to everything selected, as one undo step. */
  const patchSelection = useCallback(
    (patchFor: (element: BoardElement) => Partial<BoardElement> | null) => {
      const conn = connectionRef.current
      if (!conn) return

      const targets = Array.from(selectedIds)
        .map((id) => elements.get(id))
        .filter((el): el is BoardElement => Boolean(el))

      conn.doc.transact(() => {
        targets.forEach((el) => {
          const patch = patchFor(el)
          if (patch) patchElement(conn, el.id, patch)
        })
      })
    },
    [selectedIds, elements]
  )

  const handleFillChange = useCallback(
    (color: string) => {
      patchSelection((el) => colorPatchFor(el, color, 'fill'))
      // With no palette in the toolbar, the last fill used becomes the colour
      // the next note is created with.
      setDefaultFill(color)
    },
    [patchSelection]
  )

  const handleStrokeColorChange = useCallback(
    (color: string) => patchSelection((el) => colorPatchFor(el, color, 'border')),
    [patchSelection]
  )

  const handleThicknessChange = useCallback(
    (strokeWidth: number) =>
      patchSelection((el) =>
        supportsProperty(el, 'thickness') || supportsProperty(el, 'border')
          ? ({ strokeWidth } as Partial<BoardElement>)
          : null
      ),
    [patchSelection]
  )

  const handleFontSizeChange = useCallback(
    (fontSize: number) =>
      patchSelection((el) =>
        supportsProperty(el, 'font') ? ({ fontSize } as Partial<BoardElement>) : null
      ),
    [patchSelection]
  )

  const handleFontFamilyChange = useCallback(
    (fontFamily: FontFamily) =>
      patchSelection((el) =>
        supportsProperty(el, 'font') ? ({ fontFamily } as Partial<BoardElement>) : null
      ),
    [patchSelection]
  )

  const handleTextAlignChange = useCallback(
    (textAlign: TextAlign) =>
      patchSelection((el) =>
        supportsProperty(el, 'align') ? ({ textAlign } as Partial<BoardElement>) : null
      ),
    [patchSelection]
  )

  const handleArrowheadsChange = useCallback(
    (choice: Arrowheads) =>
      patchSelection((el) =>
        el.type === 'connector' ? (patchArrowheads(choice) as Partial<BoardElement>) : null
      ),
    [patchSelection]
  )

  const handleTextColorChange = useCallback(
    (textColor: string) =>
      patchSelection((el) =>
        supportsProperty(el, 'textColor') ? ({ textColor } as Partial<BoardElement>) : null
      ),
    [patchSelection]
  )

  const handlePatternChange = useCallback(
    (pattern: FillPattern | undefined) =>
      patchSelection((el) =>
        supportsProperty(el, 'pattern') ? ({ pattern } as Partial<BoardElement>) : null
      ),
    [patchSelection]
  )

  const handleStackChange = useCallback(
    (command: StackCommand) => {
      const conn = connectionRef.current
      if (!conn) return

      // Whatever shares the stack takes part — everything but arrows.
      const stackable = new Map(
        Array.from(elements).filter(([, el]) => supportsProperty(el, 'stacking'))
      )
      // Compare the order, not the numbers: zIndex values are renumbered to
      // positions, so a command that moves nothing would still look like a
      // change and cost a pointless undo step.
      const current = orderedIds(stackable)
      const next = restack(current, selectedIds, command)
      if (next.every((id, index) => id === current[index])) return

      const patches = zIndexPatches(next, stackable)
      if (patches.size === 0) return

      conn.doc.transact(() => {
        patches.forEach((zIndex, id) => patchElement(conn, id, { zIndex }))
      })
    },
    [elements, selectedIds]
  )

  // The bar floats beside the selection and measures itself; hidden
  // mid-gesture, where it would only get in the way.
  const selectionBox = selectionBounds(selectedElements, elements)
  const showPropertiesBar = Boolean(selectionBox) && !marquee && !connectorDrag

  // While an arrow is in flight — or the connector tool is up — every element
  // shows its anchors, so the possible destinations are visible.
  const showAllAnchors = Boolean(connectorDrag || pendingAnchor) || activeTool === 'connector'

  const anchorHighlightFor = (id: string): AnchorPosition | null => {
    if (connectorDrag?.snap?.elementId === id) return connectorDrag.snap.anchor
    if (pendingAnchor?.elementId === id) return pendingAnchor.anchor
    return null
  }

  const connectorDraft = (() => {
    if (!connectorDrag) return null
    const from = elements.get(connectorDrag.fromId)
    if (!from) return null

    const opposite: Record<AnchorPosition, AnchorPosition> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    }

    return {
      from: getAnchorPosition(from, connectorDrag.fromAnchor),
      to: connectorDrag.snap?.point ?? connectorDrag.pointer,
      fromAnchor: connectorDrag.fromAnchor,
      toAnchor: connectorDrag.snap?.anchor ?? opposite[connectorDrag.fromAnchor],
      isSnapped: Boolean(connectorDrag.snap),
    }
  })()

  // ----------- Derived element lists -----------
  const { stickies, shapes, connectors, drawings, texts } = partitionElements(elements)
  // One list, so any object can sit above any other whatever its type.
  const stackedElements = [...shapes, ...stickies, ...drawings, ...texts].sort(
    (a, b) => a.zIndex - b.zIndex || a.createdAt - b.createdAt
  )

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50">
      <TopNav
        roomName={roomName}
        users={remoteUsers}
        localUserId={localUser.id}
        history={{ canUndo, canRedo, onUndo: undo, onRedo: redo }}
        export={{ png: handleExportPng, json: handleExportJson }}
      />

      <CanvasViewport
        viewport={viewport}
        onViewportChange={setViewport}
        activeTool={activeTool}
        onCanvasPointerDown={handleCanvasPointerDown}
        onCanvasPointerMove={handleCanvasPointerMove}
        onCanvasPointerUp={handleCanvasPointerUp}
      >
        {/* The stroke currently being drawn; committed ones are in the stack */}
        <DrawingLayer activePoints={drawingPoints} activeColor="#0f172a" activeWidth={3} />

        {/* Connector layer */}
        <ConnectorLayer
          connectors={connectors}
          elementsById={elements}
          selectedIds={selectedIds}
          onSelect={(id, e) => handleElementSelect(id, e)}
          draft={connectorDraft}
        />

        {/* Notes and shapes, painted back to front so stack order is what you see */}
        {stackedElements.map((element) =>
          element.type === 'drawing' ? (
            <DrawingItem
              key={element.id}
              element={element}
              isSelected={selectedIds.has(element.id)}
              isDragging={draggingIds.has(element.id)}
              onSelect={(e) => handleElementSelect(element.id, e)}
              onDragStart={(e) => handleDragStart(element.id, pointerWorld(e), e)}
              onResizeStart={(handle, e) => handleResizeStart(element.id, handle, e)}
              onResizeByKeyboard={(handle, delta) =>
                handleResizeByKeyboard(element.id, handle, delta)
              }
            />
          ) : element.type === 'sticky' ? (
            <StickyNote
              key={element.id}
              element={element}
              isSelected={selectedIds.has(element.id)}
              isDragging={draggingIds.has(element.id)}
              onSelect={(e) => handleElementSelect(element.id, e)}
              onUpdate={(partial) => updateElement(element.id, partial)}
              onDragStart={(e) => handleDragStart(element.id, pointerWorld(e), e)}
              onAnchorDragStart={(anchor, e) => handleAnchorDragStart(element.id, anchor, e)}
              onAnchorKeyActivate={(anchor) => handleAnchorKeyActivate(element.id, anchor)}
              showAnchors={showAllAnchors}
              highlightedAnchor={anchorHighlightFor(element.id)}
              onResizeStart={(handle, e) => handleResizeStart(element.id, handle, e)}
              onResizeByKeyboard={(handle, delta) =>
                handleResizeByKeyboard(element.id, handle, delta)
              }
            />
          ) : element.type === 'text' ? (
            <TextItem
              key={element.id}
              element={element}
              isSelected={selectedIds.has(element.id)}
              isDragging={draggingIds.has(element.id)}
              onSelect={(e) => handleElementSelect(element.id, e)}
              onUpdate={(patch) => updateTextElement(element, patch)}
              onDragStart={(e) => handleDragStart(element.id, pointerWorld(e), e)}
              onAnchorDragStart={(anchor, e) => handleAnchorDragStart(element.id, anchor, e)}
              onAnchorKeyActivate={(anchor) => handleAnchorKeyActivate(element.id, anchor)}
              showAnchors={showAllAnchors}
              highlightedAnchor={anchorHighlightFor(element.id)}
              onResizeStart={(handle, e) => handleResizeStart(element.id, handle, e)}
              onResizeByKeyboard={(handle, delta) =>
                handleResizeByKeyboard(element.id, handle, delta)
              }
              startEditing={element.id === justCreatedTextId}
            />
          ) : (
            <ShapeItem
              key={element.id}
              element={element}
              isSelected={selectedIds.has(element.id)}
              isDragging={draggingIds.has(element.id)}
              onSelect={(e) => handleElementSelect(element.id, e)}
              onUpdate={(partial) => updateElement(element.id, partial)}
              onDragStart={(e) => handleDragStart(element.id, pointerWorld(e), e)}
              onAnchorDragStart={(anchor, e) => handleAnchorDragStart(element.id, anchor, e)}
              onAnchorKeyActivate={(anchor) => handleAnchorKeyActivate(element.id, anchor)}
              showAnchors={showAllAnchors}
              highlightedAnchor={anchorHighlightFor(element.id)}
              onResizeStart={(handle, e) => handleResizeStart(element.id, handle, e)}
              onResizeByKeyboard={(handle, delta) =>
                handleResizeByKeyboard(element.id, handle, delta)
              }
            />
          )
        )}

        {/* Rubber-band selection */}
        {marquee && <SelectionOverlay start={marquee.start} current={marquee.current} />}

        {/* Multiplayer cursors */}
        <MultiplayerCursors remoteUsers={remoteUsers} />


      </CanvasViewport>

      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />

      {showPropertiesBar && selectionBox && (
        <PropertiesBar
          selection={selectedElements}
          bounds={selectionBox}
          viewport={viewport}
          onFillChange={handleFillChange}
          onStrokeColorChange={handleStrokeColorChange}
          onThicknessChange={handleThicknessChange}
          onFontSizeChange={handleFontSizeChange}
          onFontFamilyChange={handleFontFamilyChange}
          onArrowheadsChange={handleArrowheadsChange}
          onStackChange={handleStackChange}
          onTextAlignChange={handleTextAlignChange}
          onPatternChange={handlePatternChange}
          onTextColorChange={handleTextColorChange}
        />
      )}
      <ZoomControls viewport={viewport} onViewportChange={setViewport} />
    </div>
  )
}
