import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UndoRedoControls } from '../src/components/UI/UndoRedoControls'

function renderControls(props: Partial<React.ComponentProps<typeof UndoRedoControls>> = {}) {
  const onUndo = vi.fn()
  const onRedo = vi.fn()
  render(
    <UndoRedoControls
      canUndo={true}
      canRedo={true}
      onUndo={onUndo}
      onRedo={onRedo}
      {...props}
    />
  )
  return {
    onUndo,
    onRedo,
    undo: screen.getByRole('button', { name: 'Undo' }),
    redo: screen.getByRole('button', { name: 'Redo' }),
  }
}

describe('UndoRedoControls', () => {
  it('offers undo and redo as named buttons', () => {
    const { undo, redo } = renderControls()

    expect(undo).toBeInTheDocument()
    expect(redo).toBeInTheDocument()
  })

  it('runs the actions on click', () => {
    const { onUndo, onRedo, undo, redo } = renderControls()

    fireEvent.click(undo)
    fireEvent.click(redo)

    expect(onUndo).toHaveBeenCalledOnce()
    expect(onRedo).toHaveBeenCalledOnce()
  })

  it('disables what cannot be done', () => {
    const { undo, redo } = renderControls({ canUndo: false, canRedo: false })

    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()
  })

  it('enables each button independently', () => {
    const { undo, redo } = renderControls({ canUndo: true, canRedo: false })

    expect(undo).toBeEnabled()
    expect(redo).toBeDisabled()
  })

  it('does not fire a disabled action', () => {
    const { onUndo, undo } = renderControls({ canUndo: false })

    fireEvent.click(undo)

    expect(onUndo).not.toHaveBeenCalled()
  })

  it('teaches the keyboard shortcut through the tooltip', () => {
    const { undo, redo } = renderControls()

    expect(undo.getAttribute('title')).toMatch(/Z/)
    expect(redo.getAttribute('title')).toMatch(/Z/)
  })

  it('groups the pair under one accessible name', () => {
    renderControls()

    expect(screen.getByRole('group', { name: 'History' })).toBeInTheDocument()
  })
})
