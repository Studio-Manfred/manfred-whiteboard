/**
 * Scaling a freehand stroke.
 *
 * Resizing ink moves every point, not just its bounding box — the stroke has
 * no body of its own to stretch.
 */

import type { InkPoint } from './ink'
import type { Rect } from './marquee'

/** Maps a value from one range to another, holding still when the range is flat. */
function rescale(value: number, fromStart: number, fromSize: number, toStart: number, toSize: number): number {
  // A straight stroke has zero width or height; without this it would divide by zero.
  if (fromSize === 0) return toStart
  return toStart + ((value - fromStart) / fromSize) * toSize
}

/** The stroke's points, moved and stretched from one box into another. */
export function scalePoints(
  points: readonly InkPoint[],
  from: Rect,
  to: Rect
): InkPoint[] {
  return points.map((point) => ({
    ...point,
    x: rescale(point.x, from.x, from.width, to.x, to.width),
    y: rescale(point.y, from.y, from.height, to.y, to.height),
  }))
}

/**
 * The stroke's points, moved by an offset.
 *
 * A drawing's points are world coordinates and its svg viewBox follows its
 * box, so moving the box alone shifts both by the same amount and the ink
 * never appears to move. The points have to travel with it.
 */
export function translatePoints(
  points: readonly InkPoint[],
  dx: number,
  dy: number
): InkPoint[] {
  return points.map((point) => ({ ...point, x: point.x + dx, y: point.y + dy }))
}

