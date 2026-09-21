/**
 * Writes against the shared board document.
 *
 * Every mutation keeps `elementsMap` and `elementOrder` consistent inside a
 * single Yjs transaction, so peers and the undo manager see one atomic step.
 */

import type { BoardElement, WhiteboardDocState } from '../types/whiteboard'

/** Adds an element and appends it to the z-order. */
export function addElement(board: WhiteboardDocState, element: BoardElement): void {
  board.doc.transact(() => {
    board.elementsMap.set(element.id, element)
    board.elementOrder.push([element.id])
  })
}

/** Merges a partial update into an existing element. Unknown ids are ignored. */
export function patchElement(
  board: WhiteboardDocState,
  id: string,
  patch: Partial<BoardElement>,
  now: number = Date.now()
): void {
  const existing = board.elementsMap.get(id)
  if (!existing) return

  board.elementsMap.set(id, { ...existing, ...patch, updatedAt: now } as BoardElement)
}

/** Removes elements from both the map and the z-order. */
export function removeElements(board: WhiteboardDocState, ids: Iterable<string>): void {
  board.doc.transact(() => {
    for (const id of ids) {
      board.elementsMap.delete(id)
      const index = board.elementOrder.toArray().indexOf(id)
      if (index !== -1) board.elementOrder.delete(index, 1)
    }
  })
}
