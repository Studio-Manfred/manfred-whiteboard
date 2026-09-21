import React from 'react'
import type { DrawingElement } from '../../types/whiteboard'
import { pointsToSmoothPath } from '../../lib/stroke-path'

interface DrawingLayerProps {
  /** Completed drawing elements to render */
  drawings: DrawingElement[]
  /** Points accumulated for the stroke currently being drawn (empty when not drawing) */
  activePoints: Array<{ x: number; y: number }>
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
  const pathData = pointsToSmoothPath(element.points)

  return (
    <g data-testid={`drawing-${element.id}`}>
      {/* Fat invisible hit area */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(12, element.strokeWidth + 10)}
        className="pointer-events-stroke cursor-pointer"
        onClick={(e) => onSelect(element.id, e)}
      />
      <path
        d={pathData}
        fill="none"
        stroke={isSelected ? '#3b82f6' : element.strokeColor}
        strokeWidth={element.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-colors"
      />
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

      {/* Active in-progress stroke */}
      {activePoints.length > 1 && (
        <path
          d={pointsToSmoothPath(activePoints)}
          fill="none"
          stroke={activeColor}
          strokeWidth={activeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
        />
      )}
    </svg>
  )
}
