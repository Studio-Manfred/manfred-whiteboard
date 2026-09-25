import React, { useRef, useState, useEffect } from 'react'
import {
  zoomAtPoint,
  screenToWorld,
  type Viewport,
  type Point,
} from '../../lib/coordinates'
import { viewportFromKey } from '../../lib/keyboard-viewport'
import { DotGrid } from './DotGrid'

export type CanvasTool =
  | 'select'
  | 'pan'
  | 'sticky'
  | 'rectangle'
  | 'circle'
  | 'connector'
  | 'pen'
  | 'eraser'
  | 'text'

interface CanvasViewportProps {
  viewport: Viewport
  onViewportChange: (viewport: Viewport) => void
  activeTool: CanvasTool
  onCanvasPointerDown?: (worldPoint: Point, e: React.PointerEvent) => void
  onCanvasPointerMove?: (worldPoint: Point, e: React.PointerEvent) => void
  onCanvasPointerUp?: (worldPoint: Point, e: React.PointerEvent) => void
  children?: React.ReactNode
}

export function CanvasViewport({
  viewport,
  onViewportChange,
  activeTool,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  children,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point | null>(null)
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  // Track spacebar for quick pan toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !isSpacePressed &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        setIsSpacePressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isSpacePressed])

  // Native non-passive wheel listener for smooth focal zoom and trackpad pinch/pan
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch-to-zoom or Ctrl+Wheel
        const zoomDelta = -e.deltaY * 0.01
        const focalScreen: Point = { x: e.clientX, y: e.clientY }
        const newZoom = viewport.zoom * (1 + zoomDelta)
        onViewportChange(zoomAtPoint(viewport, focalScreen, newZoom))
      } else {
        // Pan gesture or mouse wheel
        onViewportChange({
          x: viewport.x - e.deltaX,
          y: viewport.y - e.deltaY,
          zoom: viewport.zoom,
        })
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [viewport, onViewportChange])

  const handlePointerDown = (e: React.PointerEvent) => {
    const isMiddleClick = e.button === 1
    const shouldPan = activeTool === 'pan' || isSpacePressed || isMiddleClick

    if (shouldPan) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y })
      return
    }

    const world = screenToWorld({ x: e.clientX, y: e.clientY }, viewport)
    onCanvasPointerDown?.(world, e)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && panStart) {
      onViewportChange({
        ...viewport,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
      return
    }

    const world = screenToWorld({ x: e.clientX, y: e.clientY }, viewport)
    onCanvasPointerMove?.(world, e)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false)
      setPanStart(null)
      return
    }

    const world = screenToWorld({ x: e.clientX, y: e.clientY }, viewport)
    onCanvasPointerUp?.(world, e)
  }

  // Keyboard operation of the canvas (WCAG 2.1.1): arrows pan, +/- zoom,
  // 0 resets. Zoom is anchored to the centre of the visible canvas.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return

    const rect = containerRef.current?.getBoundingClientRect()
    const focalPoint = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: 0, y: 0 }

    const next = viewportFromKey(viewport, e.key, { focalPoint, shiftKey: e.shiftKey })
    if (!next) return

    e.preventDefault()
    onViewportChange(next)
  }

  const cursorClass = isPanning
    ? 'cursor-grabbing'
    : isSpacePressed || activeTool === 'pan'
      ? 'cursor-grab'
      : activeTool === 'pen'
        ? 'cursor-crosshair'
        : 'cursor-default'

  return (
    // The canvas is a scrollable/zoomable region: WCAG 2.1.1 requires it to take
    // focus and respond to keys, which jsx-a11y cannot express for role="region".
    // Both disables below are only valid while handleKeyDown stays wired up.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={containerRef}
      role="region"
      aria-label="Interactive canvas workspace. Arrow keys pan, plus and minus zoom, zero resets zoom."
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className={`relative w-full h-full overflow-hidden select-none bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500 ${cursorClass}`}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <DotGrid viewport={viewport} />

      {/* World transform container */}
      <div
        id="canvas-world"
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
