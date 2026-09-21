import React, { useState, useEffect, useRef, useCallback } from 'react'
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
import type { Viewport, Point } from './lib/coordinates'
import type {
  BoardElement,
  StickyElement,
  ShapeElement,
  ConnectorElement,
  DrawingElement,
  UserAwareness,
  AnchorPosition,
} from './types/whiteboard'
import { PASTEL_COLORS } from './types/whiteboard'

// Generate a random user identity for this session
function generateUser() {
  const NAMES = ['Alice', 'Bob', 'Charlie', 'Dana', 'Eve', 'Frank', 'Grace', 'Hank']
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
  const idx = Math.floor(Math.random() * NAMES.length)
  return {
    id: crypto.randomUUID(),
    name: NAMES[idx],
    color: COLORS[idx],
  }
}

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
  const roomName = getRoomFromUrl()

  // ----------- CRDT Connection & Sync -----------
  useEffect(() => {
    const conn = initWhiteboardConnection(roomName)
    connectionRef.current = conn

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
      conn.destroy()
    }
  }, [roomName])

  // ----------- Keyboard Shortcuts -----------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const key = e.key.toLowerCase()
      const toolMap: Record<string, CanvasTool> = {
        v: 'select',
        h: 'pan',
        s: 'sticky',
        r: 'rectangle',
        c: 'circle',
        l: 'connector',
        p: 'pen',
        e: 'eraser',
      }

      if (toolMap[key]) {
        setActiveTool(toolMap[key])
        return
      }

      // Delete selected elements
      if ((key === 'delete' || key === 'backspace') && selectedIds.size > 0) {
        const conn = connectionRef.current
        if (!conn) return
        conn.doc.transact(() => {
          selectedIds.forEach((id) => {
            conn.elementsMap.delete(id)
            // Remove from order array
            const orderArr = conn.elementOrder.toArray()
            const idx = orderArr.indexOf(id)
            if (idx !== -1) conn.elementOrder.delete(idx, 1)
          })
        })
        setSelectedIds(new Set())
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        e.preventDefault()
        const conn = connectionRef.current
        if (!conn) return
        if (e.shiftKey) {
          conn.undoManager.redo()
        } else {
          conn.undoManager.undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds])

  // ----------- Element CRDT helpers -----------
  const updateElement = useCallback((id: string, partial: Partial<BoardElement>) => {
    const conn = connectionRef.current
    if (!conn) return
    const existing = conn.elementsMap.get(id)
    if (!existing) return
    conn.elementsMap.set(id, { ...existing, ...partial, updatedAt: Date.now() } as BoardElement)
  }, [])

  const createElement = useCallback((el: BoardElement) => {
    const conn = connectionRef.current
    if (!conn) return
    conn.doc.transact(() => {
      conn.elementsMap.set(el.id, el)
      conn.elementOrder.push([el.id])
    })
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
        const id = crypto.randomUUID()
        const colorIdx = Math.floor(Math.random() * PASTEL_COLORS.length)
        const newSticky: StickyElement = {
          id,
          type: 'sticky',
          x: worldPoint.x - 100,
          y: worldPoint.y - 100,
          width: 200,
          height: 200,
          zIndex: elements.size + 1,
          text: '',
          color: PASTEL_COLORS[colorIdx],
          fontSize: 16,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        createElement(newSticky)
        setSelectedIds(new Set([id]))
        setActiveTool('select')
        return
      }

      if (activeTool === 'rectangle' || activeTool === 'circle') {
        const id = crypto.randomUUID()
        const newShape: ShapeElement = {
          id,
          type: 'shape',
          shapeType: activeTool === 'circle' ? 'circle' : 'rectangle',
          x: worldPoint.x - 60,
          y: worldPoint.y - 50,
          width: 120,
          height: 100,
          zIndex: elements.size + 1,
          fillColor: 'transparent',
          strokeColor: '#0f172a',
          strokeWidth: 2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        createElement(newShape)
        setSelectedIds(new Set([id]))
        setActiveTool('select')
        return
      }

      if (activeTool === 'pen') {
        isDrawing.current = true
        setDrawingPoints([{ x: worldPoint.x, y: worldPoint.y }])
        return
      }

      if (activeTool === 'eraser') {
        // Find element under cursor and delete it
        const conn = connectionRef.current
        if (!conn) return
        for (const [id, el] of elements) {
          if (
            worldPoint.x >= el.x &&
            worldPoint.x <= el.x + el.width &&
            worldPoint.y >= el.y &&
            worldPoint.y <= el.y + el.height
          ) {
            conn.doc.transact(() => {
              conn.elementsMap.delete(id)
              const orderArr = conn.elementOrder.toArray()
              const idx = orderArr.indexOf(id)
              if (idx !== -1) conn.elementOrder.delete(idx, 1)
            })
            break
          }
        }
      }
    },
    [activeTool, elements, createElement]
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
          const id = crypto.randomUUID()
          // Compute bounding box
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          drawingPoints.forEach((p) => {
            minX = Math.min(minX, p.x)
            minY = Math.min(minY, p.y)
            maxX = Math.max(maxX, p.x)
            maxY = Math.max(maxY, p.y)
          })
          const drawing: DrawingElement = {
            id,
            type: 'drawing',
            x: minX,
            y: minY,
            width: maxX - minX || 1,
            height: maxY - minY || 1,
            zIndex: elements.size + 1,
            points: drawingPoints,
            strokeColor: '#0f172a',
            strokeWidth: 3,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          createElement(drawing)
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
      // Complete connector
      const connectorId = crypto.randomUUID()
      const connector: ConnectorElement = {
        id: connectorId,
        type: 'connector',
        fromId: pendingConnector.fromId,
        toId: id,
        fromAnchor: pendingConnector.fromAnchor,
        toAnchor: 'left',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        zIndex: elements.size + 1,
        strokeColor: '#475569',
        strokeWidth: 2,
        style: 'curved',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      createElement(connector)
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
      // Complete the connector
      const connectorId = crypto.randomUUID()
      const connector: ConnectorElement = {
        id: connectorId,
        type: 'connector',
        fromId: pendingConnector.fromId,
        toId: elementId,
        fromAnchor: pendingConnector.fromAnchor,
        toAnchor: anchor,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        zIndex: elements.size + 1,
        strokeColor: '#475569',
        strokeWidth: 2,
        style: 'curved',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      createElement(connector)
      setPendingConnector(null)
    } else {
      setPendingConnector({ fromId: elementId, fromAnchor: anchor })
      setActiveTool('connector')
    }
  }, [pendingConnector, elements, createElement])

  // ----------- Derived element lists -----------
  const stickies: StickyElement[] = []
  const shapes: ShapeElement[] = []
  const connectors: ConnectorElement[] = []
  const drawings: DrawingElement[] = []

  elements.forEach((el) => {
    switch (el.type) {
      case 'sticky':
        stickies.push(el as StickyElement)
        break
      case 'shape':
        shapes.push(el as ShapeElement)
        break
      case 'connector':
        connectors.push(el as ConnectorElement)
        break
      case 'drawing':
        drawings.push(el as DrawingElement)
        break
    }
  })

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50">
      <TopNav roomName={roomName} users={remoteUsers} localUserId={localUser.id} />

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
            onDragStart={(e) => {
              const world = { x: shape.x, y: shape.y }
              handleDragStart(shape.id, world, e)
            }}
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
            onDragStart={(e) => {
              const world = { x: sticky.x, y: sticky.y }
              handleDragStart(sticky.id, world, e)
            }}
            onAnchorClick={(anchor) => handleAnchorClick(sticky.id, anchor)}
          />
        ))}

        {/* Multiplayer cursors */}
        <MultiplayerCursors remoteUsers={remoteUsers} />


      </CanvasViewport>

      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <ZoomControls viewport={viewport} onViewportChange={setViewport} />
    </div>
  )
}
