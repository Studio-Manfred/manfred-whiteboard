/**
 * Finding where a dragged connector should land.
 *
 * Pure over the element map: pointer in, the anchor it should snap to out.
 * Distances are world units, so snapping feels the same at any zoom.
 */

import { getAnchorPosition } from './connector-math'
import type { Point } from './coordinates'
import type { AnchorPosition, BoardElement } from '../types/whiteboard'

/** How close, in world units, the pointer must come to an anchor to snap. */
export const SNAP_RADIUS = 60

const ANCHORS: AnchorPosition[] = ['top', 'right', 'bottom', 'left']

export interface AnchorCandidate {
  elementId: string
  anchor: AnchorPosition
  point: Point
  /** Distance from the pointer, once found. */
  distance: number
}

/** Only elements with real geometry can hold an arrow. */
function canBeAnEndpoint(element: BoardElement): boolean {
  return element.type === 'sticky' || element.type === 'shape'
}

/** The four edge midpoints an arrow can attach to. */
export function elementAnchors(element: BoardElement): AnchorCandidate[] {
  return ANCHORS.map((anchor) => ({
    elementId: element.id,
    anchor,
    point: getAnchorPosition(element, anchor),
    distance: 0,
  }))
}

function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function containsPoint(element: BoardElement, point: Point): boolean {
  return (
    point.x >= element.x &&
    point.x <= element.x + element.width &&
    point.y >= element.y &&
    point.y <= element.y + element.height
  )
}

export interface SnapOptions {
  /** The element the drag started from — an arrow cannot loop back to it. */
  excludeId: string
  radius?: number
}

/**
 * The anchor a connector being dragged to `pointer` should attach to, or null.
 *
 * Releasing anywhere over an element counts as aiming at it, snapping to
 * whichever of its anchors is nearest; demanding a direct hit on a small dot
 * would make the interaction fussy.
 */
export function findSnapTarget(
  elements: ReadonlyMap<string, BoardElement>,
  pointer: Point,
  { excludeId, radius = SNAP_RADIUS }: SnapOptions
): AnchorCandidate | null {
  let best: AnchorCandidate | null = null

  elements.forEach((element, id) => {
    if (id === excludeId || !canBeAnEndpoint(element)) return

    const inside = containsPoint(element, pointer)

    for (const candidate of elementAnchors(element)) {
      const distance = distanceBetween(candidate.point, pointer)
      if (!inside && distance > radius) continue
      if (best && best.distance <= distance) continue

      best = { ...candidate, distance }
    }
  })

  return best
}
