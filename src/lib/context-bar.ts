/**
 * Where the floating properties bar goes.
 *
 * The bar lives outside the world transform — it must not scale with zoom —
 * so its position is computed in screen space from the selection's world
 * bounds. Pure, so the flipping and clamping can be tested without a DOM.
 */

import { worldToScreen, type Viewport } from './coordinates'
import { getAnchorPosition } from './connector-math'
import type { Rect } from './marquee'
import type { BoardElement } from '../types/whiteboard'

/** Space between the bar and the selection. */
export const BAR_GAP = 12
/** How close the bar may come to the window edge. */
export const VIEWPORT_MARGIN = 12
/**
 * Room kept for a panel opening upward out of the bar. Without it the bar can
 * sit high enough that its own panel opens off-screen, or under the top bar.
 */
export const PANEL_ALLOWANCE = 160

/** An arrow has no geometry of its own; use the anchors it joins. */
function connectorBounds(
  connector: Extract<BoardElement, { type: 'connector' }>,
  elements: ReadonlyMap<string, BoardElement>
): Rect | null {
  const from = elements.get(connector.fromId)
  const to = elements.get(connector.toId)
  if (!from || !to) return null

  const start = getAnchorPosition(from, connector.fromAnchor)
  const end = getAnchorPosition(to, connector.toAnchor)

  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

/** The world-space box around everything selected, or null if it has none. */
export function selectionBounds(
  selected: readonly BoardElement[],
  elements: ReadonlyMap<string, BoardElement>
): Rect | null {
  const boxes = selected
    .map((el) => (el.type === 'connector' ? connectorBounds(el, elements) : el))
    .filter((box): box is Rect => box !== null)

  if (boxes.length === 0) return null

  const minX = Math.min(...boxes.map((b) => b.x))
  const minY = Math.min(...boxes.map((b) => b.y))
  const maxX = Math.max(...boxes.map((b) => b.x + b.width))
  const maxY = Math.max(...boxes.map((b) => b.y + b.height))

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export interface BarPosition {
  x: number
  y: number
  placement: 'above' | 'below'
}

interface Size {
  width: number
  height: number
}

/**
 * Screen position for the bar: centred over the selection and above it,
 * flipping below when there is no room, and always kept on screen.
 */
export function contextBarPosition(
  bounds: Rect | null,
  viewport: Viewport,
  bar: Size,
  screen: Size
): BarPosition | null {
  if (!bounds) return null

  const topLeft = worldToScreen({ x: bounds.x, y: bounds.y }, viewport)
  const bottomRight = worldToScreen(
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    viewport
  )

  const above = topLeft.y - bar.height - BAR_GAP
  const placement: BarPosition['placement'] =
    above < VIEWPORT_MARGIN + PANEL_ALLOWANCE ? 'below' : 'above'

  const centre = (topLeft.x + bottomRight.x) / 2
  const x = Math.min(
    Math.max(centre - bar.width / 2, VIEWPORT_MARGIN),
    screen.width - bar.width - VIEWPORT_MARGIN
  )

  return {
    x,
    y: placement === 'above' ? above : bottomRight.y + BAR_GAP,
    placement,
  }
}
