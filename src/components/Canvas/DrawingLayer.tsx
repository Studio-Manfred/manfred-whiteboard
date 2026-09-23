import React from 'react'
import type { DrawingElement } from '../../types/whiteboard'
import { pointsToSmoothPath } from '../../lib/stroke-path'
import { isPenStroke, penOutlinePath, type InkPoint } from '../../lib/ink'

interface DrawingLayerProps {
  /** Completed drawing elements to render */
  drawings: DrawingElement[]
  /** Points accumulated for the stroke currently being drawn (empty when not drawing) */
  activePoints: InkPoint[]
  /** Stroke color for the active drawing */
  activeColor: string
  /** Stroke width for the active drawing */
  activeWidth: number
  selectedIds: Set<string>
  onSelect: (id: string, e: React.MouseEvent) => void
}

const DrawingPath = React.memo(function DrawingPath({
  element,
  isSelected,
  onSelect,
}: {
  element: DrawingElement
  isSelected: boolean
  onSelect: (id: string, e: React.MouseEvent) => void
}) {
  // The centre line, used for the hit area whichever engine drew the stroke:
  // a tapered tail is too thin to click.
  const centreLine = pointsToSmoothPath(element.points)
  const isPen = isPenStroke(element)
  const color = isSelected ? '#3b82f6' : element.strokeColor

  return (
    <g data-testid={`drawing-${element.id}`}>
      {/* Fat invisible hit area */}
      <path
        d={centreLine}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(12, element.strokeWidth + 10)}
        // `pointer-events-stroke` is not a Tailwind utility and generated no CSS,
        // so this path inherited pointer-events:none from the svg and was unclickable.
        style={{ pointerEvents: 'stroke' }}
        className="cursor-pointer"
        onClick={(e) => onSelect(element.id, e)}
      />
      {isPen ? (
        // Pen ink varies in width along the stroke, so it is a filled outline
        // rather than a stroked line.
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
    </g>
  )
})

export function DrawingLayer({
  drawings,
  activePoints,
  activeColor,
  activeWidth,
  selectedIds,
  onSelect,
}: DrawingLayerProps) {
  return (
    <svg
      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      style={{ zIndex: 4 }}
    >
      {/* Completed drawings */}
      {drawings.map((drawing) => (
        <DrawingPath
          key={drawing.id}
          element={drawing}
          isSelected={selectedIds.has(drawing.id)}
          onSelect={onSelect}
        />
      ))}

      {/* Active in-progress stroke, drawn by the same engine as a committed one */}
      {activePoints.length > 1 && (
        <path
          data-testid="active-stroke"
          d={penOutlinePath(activePoints, activeWidth)}
          fill={activeColor}
          opacity={0.7}
        />
      )}
    </svg>
  )
}
