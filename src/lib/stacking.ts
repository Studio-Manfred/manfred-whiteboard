/**
 * Stack order: which element paints over which.
 *
 * Works on a plain ordered list of ids, back to front, so the four commands
 * are simple list moves and can be tested without a board.
 */

import type { BoardElement } from '../types/whiteboard'

export type StackCommand = 'front' | 'forward' | 'backward' | 'back'

/** Ids back to front. Ties break by creation time so the order never wobbles. */
export function orderedIds(elements: ReadonlyMap<string, BoardElement>): string[] {
  return Array.from(elements.values())
    .sort((a, b) => a.zIndex - b.zIndex || a.createdAt - b.createdAt)
    .map((el) => el.id)
}

/**
 * The order produced by applying a command to the selection.
 *
 * Selected elements keep their order relative to each other, and a step moves
 * the whole group past one unselected neighbour — so a group travels together
 * rather than colliding with itself.
 */
export function restack(
  order: readonly string[],
  selected: ReadonlySet<string>,
  command: StackCommand
): string[] {
  const chosen = order.filter((id) => selected.has(id))
  if (chosen.length === 0 || chosen.length === order.length) return [...order]

  const rest = order.filter((id) => !selected.has(id))

  if (command === 'front') return [...rest, ...chosen]
  if (command === 'back') return [...chosen, ...rest]

  const positions = chosen.map((id) => order.indexOf(id))

  if (command === 'forward') {
    // The neighbour just in front of the frontmost selected element.
    const target = order.findIndex(
      (id, index) => index > Math.max(...positions) && !selected.has(id)
    )
    if (target === -1) return [...order]

    const before = rest.slice(0, rest.indexOf(order[target]) + 1)
    const after = rest.slice(rest.indexOf(order[target]) + 1)
    return [...before, ...chosen, ...after]
  }

  // backward: the neighbour just behind the backmost selected element
  const behind = order
    .slice(0, Math.min(...positions))
    .filter((id) => !selected.has(id))
  if (behind.length === 0) return [...order]

  const pivot = behind[behind.length - 1]
  const before = rest.slice(0, rest.indexOf(pivot))
  const after = rest.slice(rest.indexOf(pivot))
  return [...before, ...chosen, ...after]
}

/**
 * New zIndex values for an order, as position in the list — only for the
 * elements that actually moved, so a no-op command writes nothing.
 */
export function zIndexPatches(
  order: readonly string[],
  elements: ReadonlyMap<string, BoardElement>
): Map<string, number> {
  const patches = new Map<string, number>()

  order.forEach((id, index) => {
    const element = elements.get(id)
    if (element && element.zIndex !== index) patches.set(id, index)
  })

  return patches
}
