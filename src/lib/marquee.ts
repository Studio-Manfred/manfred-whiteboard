/**
 * Marquee (rubber-band) selection geometry, in world coordinates.
 */

import type { Point } from './coordinates'
import type { BoardElement } from '../types/whiteboard'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** A rect from two dragged corners, whichever direction the drag went. */
export function rectFromPoints(start: Point, current: Point): Rect {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  }
}

/** Overlapping area, not merely touching edges. */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/**
 * Ids of every element the marquee touches. Clipping an element is enough to
 * select it — requiring full containment makes a marquee frustrating to use.
 */
export function elementsInMarquee(
  elements: ReadonlyMap<string, BoardElement>,
  rect: Rect
): string[] {
  if (rect.width === 0 || rect.height === 0) return []

  const hit: string[] = []
  elements.forEach((el, id) => {
    if (rectsIntersect(rect, el)) hit.push(id)
  })

  return hit
}
