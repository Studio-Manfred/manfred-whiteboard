import React from 'react'
import { isPenStroke, penOutlinePath } from '../../lib/ink'
import { pointsToSmoothPath } from '../../lib/stroke-path'
import { dropShadowFilter, elevationFor } from '../../lib/elevation'
import { ResizeHandles } from './ResizeHandles'
import type { ResizeHandle } from '../../lib/resize'
import type { Point } from '../../lib/coordinates'
import type { DrawingElement } from '../../types/whiteboard'

interface DrawingItemProps {
  element: DrawingElement
  isSelected: boolean
  isDragging?: boolean
  onSelect: (e: React.MouseEvent) => void
  onDragStart: (e: React.PointerEvent) => void
  onResizeStart?: (handle: ResizeHandle, e: React.PointerEvent) => void
  onResizeByKeyboard?: (handle: ResizeHandle, delta: Point) => void
}

/** Room around the stroke for its own width, so nothing is clipped. */
const BLEED = 24

/**
 * One freehand stroke, positioned in the world like any other object so it can
 * be stacked among notes and shapes rather than living on a layer beneath them.
 */
export function DrawingItem({
  element,
  isSelected,
  isDragging = false,
  onSelect,
  onDragStart,
  onResizeStart,
  onResizeByKeyboard,
}: DrawingItemProps) {
  const centreLine = pointsToSmoothPath(element.points)
  const color = isSelected ? '#3b82f6' : element.strokeColor
  const elevation = dropShadowFilter(elevationFor({ isSelected, isDragging }))

  return (
    <div
      data-testid={`drawing-${element.id}`}
      className="absolute z-10"
      style={{
        left: `${element.x - BLEED}px`,
        top: `${element.y - BLEED}px`,
        width: `${element.width + BLEED * 2}px`,
        height: `${element.height + BLEED * 2}px`,
      }}
    >
      {/* The stroke is drawn in world coordinates, so the svg is shifted back. */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
        viewBox={`${element.x - BLEED} ${element.y - BLEED} ${element.width + BLEED * 2} ${
          element.height + BLEED * 2
        }`}
        style={{ filter: elevation }}
      >
        {/* Fat invisible hit area: a tapered tail is too thin to click. */}
        <path
          d={centreLine}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(12, element.strokeWidth + 10)}
          style={{ pointerEvents: 'stroke' }}
          className="cursor-pointer"
          onClick={onSelect}
          onPointerDown={(e) => {
            onSelect(e)
            onDragStart(e)
          }}
        />
        {isPenStroke(element) ? (
          <path
            data-ink="pen"
            d={penOutlinePath(element.points, element.strokeWidth)}
            fill={color}
            className="transition-colors"
          />
        ) : (
          <path
            d={centreLine}
            fill="none"
            stroke={color}
            strokeWidth={element.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors"
          />
        )}
      </svg>

      {isSelected && (
        <>
          {/* Ink has no body, so selection needs an outline of its own. */}
          <div
            aria-hidden="true"
            className="absolute border border-dashed border-blue-500 pointer-events-none"
            style={{
              left: `${BLEED}px`,
              top: `${BLEED}px`,
              width: `${element.width}px`,
              height: `${element.height}px`,
            }}
          />
          {onResizeStart && onResizeByKeyboard && (
            <div
              className="absolute"
              style={{
                left: `${BLEED}px`,
                top: `${BLEED}px`,
                width: `${element.width}px`,
                height: `${element.height}px`,
              }}
            >
              <ResizeHandles
                onResizeStart={onResizeStart}
                onResizeByKeyboard={onResizeByKeyboard}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
