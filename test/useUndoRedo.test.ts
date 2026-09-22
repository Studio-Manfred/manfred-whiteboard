import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as Y from 'yjs'
import { useUndoRedo } from '../src/hooks/useUndoRedo'
import { createWhiteboardDoc } from '../src/types/whiteboard'

function board() {
  const { doc, elementsMap, elementOrder } = createWhiteboardDoc(new Y.Doc())
  const undoManager = new Y.UndoManager([elementsMap, elementOrder])
  return { doc, elementsMap, elementOrder, undoManager }
}

function addSomething(b: ReturnType<typeof board>, id = 'a') {
  b.doc.transact(() => {
    b.elementOrder.push([id])
  })
}

describe('useUndoRedo', () => {
  it('reports nothing to undo or redo on a fresh board', () => {
    const b = board()
    const { result } = renderHook(() => useUndoRedo(b.undoManager))

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('becomes undoable once something is on the board', () => {
    const b = board()
    const { result } = renderHook(() => useUndoRedo(b.undoManager))

    act(() => addSomething(b))

    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('undoing flips the board to redoable', () => {
    const b = board()
    const { result } = renderHook(() => useUndoRedo(b.undoManager))
    act(() => addSomething(b))

    act(() => result.current.undo())

    expect(b.elementOrder.toArray()).toEqual([])
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })

  it('redoing puts the change back', () => {
    const b = board()
    const { result } = renderHook(() => useUndoRedo(b.undoManager))
    act(() => addSomething(b))
    act(() => result.current.undo())

    act(() => result.current.redo())

    expect(b.elementOrder.toArray()).toEqual(['a'])
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('a new change clears the redo stack', () => {
    const b = board()
    const { result } = renderHook(() => useUndoRedo(b.undoManager))
    act(() => addSomething(b, 'a'))
    act(() => result.current.undo())
    expect(result.current.canRedo).toBe(true)

    act(() => addSomething(b, 'b'))

    expect(result.current.canRedo).toBe(false)
  })

  it('is inert before the board document exists', () => {
    const { result } = renderHook(() => useUndoRedo(null))

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
    expect(() => {
      result.current.undo()
      result.current.redo()
    }).not.toThrow()
  })

  it('picks up a manager that arrives after the first render', () => {
    const b = board()
    const { result, rerender } = renderHook(
      ({ manager }) => useUndoRedo(manager),
      { initialProps: { manager: null as Y.UndoManager | null } }
    )

    rerender({ manager: b.undoManager })
    act(() => addSomething(b))

    expect(result.current.canUndo).toBe(true)
  })

  it('stops listening once unmounted', () => {
    const b = board()
    const { unmount } = renderHook(() => useUndoRedo(b.undoManager))

    unmount()

    expect(() => addSomething(b)).not.toThrow()
    expect(b.undoManager.undoStack.length).toBe(1)
  })
})
