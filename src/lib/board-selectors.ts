/**
 * Read-only views over the board: splitting elements into render layers and
 * hit-testing a world point.
 */

import type { Point } from './coordinates'
import type {
  BoardElement,
  ConnectorElement,
  DrawingElement,
  ShapeElement,
  StickyElement,
} from '../types/whiteboard'

export interface BoardLayers {
  stickies: StickyElement[]
  shapes: ShapeElement[]
  connectors: ConnectorElement[]
  drawings: DrawingElement[]
}

/**
 * Splits the board into the four lists the canvas renders. Element types with
 * no layer of their own (frames) are skipped.
 */
export function partitionElements(elements: ReadonlyMap<string, BoardElement>): BoardLayers {
  const layers: BoardLayers = { stickies: [], shapes: [], connectors: [], drawings: [] }

  elements.forEach((el) => {
    switch (el.type) {
      case 'sticky':
        layers.stickies.push(el)
        break
      case 'shape':
        layers.shapes.push(el)
        break
      case 'connector':
        layers.connectors.push(el)
        break
      case 'drawing':
        layers.drawings.push(el)
        break
    }
  })

  return layers
}

function containsPoint(el: BoardElement, point: Point): boolean {
  return (
    point.x >= el.x &&
    point.x <= el.x + el.width &&
    point.y >= el.y &&
    point.y <= el.y + el.height
  )
}

/**
 * The id of the element under a world point, or null. Where elements overlap
 * the topmost one wins, so the eraser removes what the user can actually see.
 */
export function findElementAt(
  elements: ReadonlyMap<string, BoardElement>,
  point: Point
): string | null {
  let hitId: string | null = null
  let hitZ = -Infinity

  elements.forEach((el, id) => {
    if (containsPoint(el, point) && el.zIndex >= hitZ) {
      hitId = id
      hitZ = el.zIndex
    }
  })

  return hitId
}
