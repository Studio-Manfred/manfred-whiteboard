/**
 * Freehand stroke geometry: turns sampled pen points into an SVG path.
 *
 * Lives in `lib/` rather than next to `DrawingLayer` so the component file only
 * exports components (React Fast Refresh) and so the maths can be unit-tested.
 */

export interface StrokePoint {
  x: number
  y: number
}

/**
 * Converts sampled pointer positions into a smooth SVG path string.
 *
 * Uses Catmull-Rom → cubic Bézier conversion so the stroke reads as a natural
 * pen line rather than a chain of straight segments.
 */
export function pointsToSmoothPath(points: StrokePoint[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let d = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return d
}
