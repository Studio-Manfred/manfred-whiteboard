import { type Point } from '../../lib/coordinates'

interface SelectionOverlayProps {
  start: Point
  current: Point
}

export function SelectionOverlay({ start, current }: SelectionOverlayProps) {
  const left = Math.min(start.x, current.x)
  const top = Math.min(start.y, current.y)
  const width = Math.abs(current.x - start.x)
  const height = Math.abs(current.y - start.y)

  return (
    <div
      data-testid="selection-marquee"
      className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-50 rounded-xs"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  )
}
