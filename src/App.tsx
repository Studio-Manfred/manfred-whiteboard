import React, { useState, useEffect, useRef, useCallback } from 'react'
import type * as Y from 'yjs'
import { CanvasViewport, type CanvasTool } from './components/Canvas/CanvasViewport'
import { StickyNote } from './components/Canvas/StickyNote'
import { ShapeItem } from './components/Canvas/ShapeItem'
import { ConnectorLayer } from './components/Canvas/ConnectorLayer'
import { DrawingLayer } from './components/Canvas/DrawingLayer'
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
} from './lib/element-factories'
import { partitionElements, findElementAt } from './lib/board-selectors'
import { elementsInMarquee, rectFromPoints } from './lib/marquee'
import { boardBounds, boardToJson, boardToSvg } from './lib/board-export'
import { resizeRect, type ResizeHandle } from './lib/resize'
import { boardFilename, downloadBlob, svgToPngBlob } from './lib/download'
import {
  colorPatchFor,
  currentFillOf,
  supportsColorTarget,
  type ColorTarget,
} from './lib/element-colors'
import { addElement, patchElement, removeElements } from './lib/board-mutations'
import { toolForShortcut } from './lib/tool-shortcuts'
import { generateUser } from './lib/user-identity'
import { useUndoRedo } from './hooks/useUndoRedo'
import { PASTEL_COLORS } from './types/whiteboard'
import type {
  BoardElement,
  UserAwareness,
  AnchorPosition,
} from './types/whiteboard'

const localUser = generateUser()

export default function App() {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [activeTool, setActiveTool] = useState<CanvasTool>('select')
  const [elements, setElements] = useState<Map<string, BoardElement>>(new Map())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [remoteUsers, setRemoteUsers] = useState<UserAwareness[]>([])

  // Drawing state
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([])
  const isDrawing = useRef(false)

  // Connector creation state
  const [pendingConnector, setPendingConnector] = useState<{
    fromId: string
    fromAnchor: AnchorPosition
  } | null>(null)

  // Drag state
  const dragState = useRef<{
    startWorld: Point
    /** Where each dragged element started, so a group keeps its shape. */
    origins: Map<string, Point>
  } | null>(null)

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

  // ----------- Canvas Pointer Handlers -----------
  const handleCanvasPointerDown = useCallback(
    (worldPoint: Point) => {
      // Empty canvas: start a rubber-band selection. A click with no drag ends
      // up as a zero-size marquee, which selects nothing — i.e. deselects.
      if (activeTool === 'select') {
        setSelectedIds(new Set())
        setPendingConnector(null)
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
        setDrawingPoints((prev) => [...prev, { x: worldPoint.x, y: worldPoint.y }])
        return
      }

      // Resize in progress — measured from where the drag began, not the last frame
      if (resizeState.current) {
        const { elementId, handle, startRect, startWorld } = resizeState.current
        const conn = connectionRef.current
        if (!conn) return

        const next = resizeRect(
          startRect,
          handle,
          { x: worldPoint.x - startWorld.x, y: worldPoint.y - startWorld.y },
          { preserveAspectRatio: e.shiftKey }
        )
        patchElement(conn, elementId, next)
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
        const dx = worldPoint.x - startWorld.x
        const dy = worldPoint.y - startWorld.y

        const conn = connectionRef.current
        if (!conn) return

        // One transaction so a group move is a single undo step.
        conn.doc.transact(() => {
          origins.forEach((origin, id) => {
            patchElement(conn, id, { x: origin.x + dx, y: origin.y + dy })
          })
        })
      }
    },
    [activeTool, marquee, elements]
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

      // Finish the rubber band; the selection it produced stays put.
      if (marquee) {
        setMarquee(null)
        return
      }

      // Finish drag
      dragState.current = null
    },
    [activeTool, drawingPoints, elements, createElement, marquee]
  )

  // ----------- Element event handlers -----------
  const handleElementSelect = useCallback((id: string, e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation()
    if (activeTool === 'connector' && pendingConnector) {
      createElement(
        createConnectorElement(
          {
            fromId: pendingConnector.fromId,
            fromAnchor: pendingConnector.fromAnchor,
            toId: id,
            toAnchor: 'left',
          },
          { zIndex: elements.size + 1 }
        )
      )
      setPendingConnector(null)
      setActiveTool('select')
      return
    }

    const additive = 'shiftKey' in e && e.shiftKey
    setSelectedIds((previous) => {
      if (!additive) return new Set([id])

      const next = new Set(previous)
      // Shift on an already-selected element takes it back out again.
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [activeTool, pendingConnector, elements, createElement])

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
      const origins = new Map<string, Point>()
      group.forEach((memberId) => {
        const member = elements.get(memberId)
        if (member) origins.set(memberId, { x: member.x, y: member.y })
      })

      dragState.current = { startWorld: worldPoint, origins }
    },
    [elements, selectedIds]
  )

  const handleAnchorClick = useCallback((elementId: string, anchor: AnchorPosition) => {
    if (pendingConnector) {
      createElement(
        createConnectorElement(
          {
            fromId: pendingConnector.fromId,
            fromAnchor: pendingConnector.fromAnchor,
            toId: elementId,
            toAnchor: anchor,
          },
          { zIndex: elements.size + 1 }
        )
      )
      setPendingConnector(null)
    } else {
      setPendingConnector({ fromId: elementId, fromAnchor: anchor })
      setActiveTool('connector')
    }
  }, [pendingConnector, elements, createElement])

  // Presence shows everything the user has selected, not just the last click.
  useEffect(() => {
    connectionRef.current?.awareness?.setLocalStateField('selection', Array.from(selectedIds))
  }, [selectedIds])

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
      patchElement(conn, id, next)
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

  // ----------- Colour -----------
  const selectedElements = Array.from(selectedIds)
    .map((id) => elements.get(id))
    .filter((el): el is BoardElement => Boolean(el))

  const handleColorSelect = useCallback(
    (color: string, target: ColorTarget) => {
      const selected = Array.from(selectedIds)
        .map((id) => elements.get(id))
        .filter((el): el is BoardElement => Boolean(el))

      if (selected.length === 0) {
        // Nothing selected: the choice becomes the colour of the next note.
        if (target === 'fill') setDefaultFill(color)
        return
      }

      const conn = connectionRef.current
      if (!conn) return

      // One transaction, so recolouring a selection is a single undo step.
      conn.doc.transact(() => {
        selected.forEach((el) => {
          const patch = colorPatchFor(el, color, target)
          if (patch) patchElement(conn, el.id, patch)
        })
      })
    },
    [selectedIds, elements]
  )

  // Show what the selection actually has, so the palette never claims a colour
  // the selected element is not wearing.
  const currentFill =
    (selectedElements.length === 1 ? currentFillOf(selectedElements[0]) : null) ??
    defaultFill ??
    PASTEL_COLORS[0]

  // ----------- Derived element lists -----------
  const { stickies, shapes, connectors, drawings } = partitionElements(elements)

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
        {/* Drawing layer (behind everything) */}
        <DrawingLayer
          drawings={drawings}
          activePoints={drawingPoints}
          activeColor="#0f172a"
          activeWidth={3}
          selectedIds={selectedIds}
          onSelect={(id, e) => handleElementSelect(id, e)}
        />

        {/* Connector layer */}
        <ConnectorLayer
          connectors={connectors}
          elementsById={elements}
          selectedIds={selectedIds}
          onSelect={(id, e) => handleElementSelect(id, e)}
        />

        {/* Shapes */}
        {shapes.map((shape) => (
          <ShapeItem
            key={shape.id}
            element={shape}
            isSelected={selectedIds.has(shape.id)}
            onSelect={(e) => handleElementSelect(shape.id, e)}
            onUpdate={(partial) => updateElement(shape.id, partial)}
            onDragStart={(e) => handleDragStart(shape.id, pointerWorld(e), e)}
            onAnchorClick={(anchor) => handleAnchorClick(shape.id, anchor)}
            onResizeStart={(handle, e) => handleResizeStart(shape.id, handle, e)}
            onResizeByKeyboard={(handle, delta) =>
              handleResizeByKeyboard(shape.id, handle, delta)
            }
          />
        ))}

        {/* Sticky notes */}
        {stickies.map((sticky) => (
          <StickyNote
            key={sticky.id}
            element={sticky}
            isSelected={selectedIds.has(sticky.id)}
            onSelect={(e) => handleElementSelect(sticky.id, e)}
            onUpdate={(partial) => updateElement(sticky.id, partial)}
            onDragStart={(e) => handleDragStart(sticky.id, pointerWorld(e), e)}
            onAnchorClick={(anchor) => handleAnchorClick(sticky.id, anchor)}
            onResizeStart={(handle, e) => handleResizeStart(sticky.id, handle, e)}
            onResizeByKeyboard={(handle, delta) =>
              handleResizeByKeyboard(sticky.id, handle, delta)
            }
          />
        ))}

        {/* Rubber-band selection */}
        {marquee && <SelectionOverlay start={marquee.start} current={marquee.current} />}

        {/* Multiplayer cursors */}
        <MultiplayerCursors remoteUsers={remoteUsers} />


      </CanvasViewport>

      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        color={{
          value: currentFill,
          showBorder: supportsColorTarget(selectedElements, 'border'),
          onSelect: handleColorSelect,
        }}
      />
      <ZoomControls viewport={viewport} onViewportChange={setViewport} />
    </div>
  )
}
