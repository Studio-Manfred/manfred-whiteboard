import { penOutlinePath, type InkPoint } from '../../lib/ink'

interface DrawingLayerProps {
  /** Points accumulated for the stroke currently being drawn (empty when not drawing) */
  activePoints: InkPoint[]
  /** Stroke colour for the active drawing */
  activeColor: string
  /** Stroke width for the active drawing */
  activeWidth: number
}

/** The in-progress stroke. Committed strokes render as DrawingItem, in the stack. */
export function DrawingLayer({
  activePoints,
  activeColor,
  activeWidth,
}: DrawingLayerProps) {
  return (
    <svg
      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      style={{ zIndex: 4 }}
    >
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
