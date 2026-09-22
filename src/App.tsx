import React, { useState, useEffect, useRef, useCallback } from 'react'
import type * as Y from 'yjs'
import { CanvasViewport, type CanvasTool } from './components/Canvas/CanvasViewport'
import { StickyNote } from './components/Canvas/StickyNote'
import { ShapeItem } from './components/Canvas/ShapeItem'
import { ConnectorLayer } from './components/Canvas/ConnectorLayer'
import { DrawingLayer } from './components/Canvas/DrawingLayer'
import { MultiplayerCursors } from './components/Canvas/MultiplayerCursors'

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
    elementId: string
    startWorld: Point
    startX: number
    startY: number
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
      // Clicking empty canvas deselects
      if (activeTool === 'select') {
        setSelectedIds(new Set())
        setPendingConnector(null)
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
    (worldPoint: Point) => {
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

      // Drag move
      if (dragState.current) {
        const { elementId, startWorld, startX, startY } = dragState.current
        const dx = worldPoint.x - startWorld.x
        const dy = worldPoint.y - startWorld.y
        updateElement(elementId, { x: startX + dx, y: startY + dy })
      }
    },
    [activeTool, updateElement]
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

      // Finish drag
      dragState.current = null
    },
    [activeTool, drawingPoints, elements, createElement]
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

    setSelectedIds(new Set([id]))
    // Broadcast selection awareness
    const conn = connectionRef.current
    if (conn?.awareness) {
      conn.awareness.setLocalStateField('selection', [id])
    }
  }, [activeTool, pendingConnector, elements, createElement])

  /** Where a pointer event sits in board coordinates. */
  const pointerWorld = useCallback(
    (e: React.PointerEvent) => screenToWorld({ x: e.clientX, y: e.clientY }, viewport),
    [viewport]
  )

  const handleDragStart = useCallback((id: string, worldPoint: Point, e: React.PointerEvent) => {
    e.stopPropagation()
    const el = elements.get(id)
    if (!el) return
    dragState.current = {
      elementId: id,
      startWorld: worldPoint,
      startX: el.x,
      startY: el.y,
    }
  }, [elements])

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
          />
        ))}

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
