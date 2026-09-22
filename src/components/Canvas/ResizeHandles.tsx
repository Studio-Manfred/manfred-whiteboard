import React from 'react'
import type { Point } from '../../lib/coordinates'
import { RESIZE_HANDLES, cursorForHandle, handleAnchorPoint, type ResizeHandle } from '../../lib/resize'

/** World pixels per arrow-key press, and with shift held. */
export const RESIZE_STEP = 10
export const RESIZE_STEP_LARGE = 40

const HANDLE_NAMES: Record<ResizeHandle, string> = {
  nw: 'top left corner',
  n: 'top edge',
  ne: 'top right corner',
  e: 'right edge',
  se: 'bottom right corner',
  s: 'bottom edge',
  sw: 'bottom left corner',
  w: 'left edge',
}

const ARROW_DELTAS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
}

interface ResizeHandlesProps {
  onResizeStart: (handle: ResizeHandle, e: React.PointerEvent) => void
  /** Arrow keys resize too — pointer-only would fail WCAG 2.1.1. */
  onResizeByKeyboard: (handle: ResizeHandle, delta: Point) => void
}

export function ResizeHandles({ onResizeStart, onResizeByKeyboard }: ResizeHandlesProps) {
  const handleKeyDown = (e: React.KeyboardEvent, handle: ResizeHandle) => {
    const direction = ARROW_DELTAS[e.key]
    if (!direction) return

    e.preventDefault()
    e.stopPropagation()
    const step = e.shiftKey ? RESIZE_STEP_LARGE : RESIZE_STEP
    onResizeByKeyboard(handle, { x: direction.x * step, y: direction.y * step })
  }

  return (
    <>
      {RESIZE_HANDLES.map((handle) => {
        const anchor = handleAnchorPoint(handle)

        return (
          <button
            key={handle}
            type="button"
            aria-label={`Resize from ${HANDLE_NAMES[handle]}`}
            onPointerDown={(e) => {
              e.stopPropagation()
              onResizeStart(handle, e)
            }}
            onKeyDown={(e) => handleKeyDown(e, handle)}
            style={{
              left: `${anchor.x * 100}%`,
              top: `${anchor.y * 100}%`,
              cursor: cursorForHandle(handle),
            }}
            className="absolute z-40 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-blue-600 bg-white shadow-sm transition-transform hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          />
        )
      })}
    </>
  )
}
