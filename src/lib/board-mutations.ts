/**
 * Writes against the shared board document.
 *
 * `addElement` and `removeElements` keep `elementsMap` and `elementOrder`
 * consistent inside a single Yjs transaction, so peers and the undo manager
 * see one atomic step. `patchElement` only touches `elementsMap` — there is
 * no `elementOrder` change to keep in step with, so it does not `transact()`.
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

/**
 * Removes elements from both the map and the z-order, along with any
 * connector whose `fromId` or `toId` points at one of them — otherwise a
 * connector outlives the endpoint it draws from or to (STU-862). The
 * `element.type === 'connector'` guard below is what keeps this one-way,
 * connector -> element: the sweep only ever *adds* a connector's own id, and
 * only when one of its endpoints is already slated for deletion — it never
 * reads a connector's `fromId`/`toId` to schedule what that connector
 * joined. So deleting a connector by id never touches the elements it
 * connects. (`!idsToDelete.has(id)` alongside it is not what enforces that —
 * re-adding an id already in the set is a no-op on a `Set` either way.) A
 * single sweep is enough because a connector's endpoints are always plain
 * elements, never other connectors, in this schema, so there is no chain to
 * follow. Runs inside one transaction so an element and its connectors are a
 * single undo step.
 */
export function removeElements(board: WhiteboardDocState, ids: Iterable<string>): void {
  board.doc.transact(() => {
    const idsToDelete = new Set(ids)

    board.elementsMap.forEach((element, id) => {
      if (
        element.type === 'connector' &&
        !idsToDelete.has(id) &&
        (idsToDelete.has(element.fromId) || idsToDelete.has(element.toId))
      ) {
        idsToDelete.add(id)
      }
    })

    for (const id of idsToDelete) {
      board.elementsMap.delete(id)
      const index = board.elementOrder.toArray().indexOf(id)
      if (index !== -1) board.elementOrder.delete(index, 1)
    }
  })
}
