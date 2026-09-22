/**
 * Reactive view of a Yjs undo manager.
 *
 * `Y.UndoManager` mutates its stacks in place, so a component cannot read
 * `undoStack.length` and expect to re-render. This subscribes to the manager's
 * own events and turns them into state.
 */

import { useCallback, useEffect, useState } from 'react'
import type * as Y from 'yjs'

export interface UndoRedoState {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

/** Pass `null` while the board document is still being set up. */
export function useUndoRedo(undoManager: Y.UndoManager | null): UndoRedoState {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    if (!undoManager) {
      setCanUndo(false)
      setCanRedo(false)
      return
    }

    const sync = () => {
      setCanUndo(undoManager.undoStack.length > 0)
      setCanRedo(undoManager.redoStack.length > 0)
    }

    undoManager.on('stack-item-added', sync)
    undoManager.on('stack-item-popped', sync)
    undoManager.on('stack-cleared', sync)
    sync()

    return () => {
      undoManager.off('stack-item-added', sync)
      undoManager.off('stack-item-popped', sync)
      undoManager.off('stack-cleared', sync)
    }
  }, [undoManager])

  const undo = useCallback(() => {
    undoManager?.undo()
    // A new change clears the redo stack without emitting a stack event.
    setCanUndo((undoManager?.undoStack.length ?? 0) > 0)
    setCanRedo((undoManager?.redoStack.length ?? 0) > 0)
  }, [undoManager])

  const redo = useCallback(() => {
    undoManager?.redo()
    setCanUndo((undoManager?.undoStack.length ?? 0) > 0)
    setCanRedo((undoManager?.redoStack.length ?? 0) > 0)
  }, [undoManager])

  return { canUndo, canRedo, undo, redo }
}
