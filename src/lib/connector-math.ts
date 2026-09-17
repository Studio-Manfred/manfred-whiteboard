import type { Point } from './coordinates'
import type { BaseElement, AnchorPosition } from '../types/whiteboard'

export type { AnchorPosition }

/**
 * Returns the exact coordinates of an anchor on a given element.
 */
export function getAnchorPosition(element: BaseElement, anchor: AnchorPosition): Point {
  switch (anchor) {
    case 'top':
      return { x: element.x + element.width / 2, y: element.y }
    case 'right':
      return { x: element.x + element.width, y: element.y + element.height / 2 }
    case 'bottom':
      return { x: element.x + element.width / 2, y: element.y + element.height }
    case 'left':
      return { x: element.x, y: element.y + element.height / 2 }
  }
}

/**
 * Calculates a smooth cubic Bézier curve path and arrowhead rotation angle between two anchors.
 */
export function calculateBezierPath(
  start: Point,
  end: Point,
  fromAnchor: AnchorPosition,
  toAnchor: AnchorPosition
): { pathData: string; angle: number } {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = Math.hypot(dx, dy)
  const offset = Math.max(30, Math.min(150, distance * 0.4))

  // Determine normal vectors based on anchor positions
  const getAnchorNormal = (anchor: AnchorPosition): Point => {
    switch (anchor) {
      case 'top':
        return { x: 0, y: -1 }
      case 'right':
        return { x: 1, y: 0 }
      case 'bottom':
        return { x: 0, y: 1 }
      case 'left':
        return { x: -1, y: 0 }
    }
  }

  const startNormal = getAnchorNormal(fromAnchor)
  const endNormal = getAnchorNormal(toAnchor)

  const cp1: Point = {
    x: start.x + startNormal.x * offset,
    y: start.y + startNormal.y * offset,
  }

  const cp2: Point = {
    x: end.x + endNormal.x * offset,
    y: end.y + endNormal.y * offset,
  }

  const pathData = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`

  // Tangent angle at endpoint for rotating the arrowhead
  const tangentDx = end.x - cp2.x
  const tangentDy = end.y - cp2.y
  const angle = (Math.atan2(tangentDy, tangentDx) * 180) / Math.PI

  return { pathData, angle }
}
