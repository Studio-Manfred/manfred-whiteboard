import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResizeHandles, RESIZE_STEP, RESIZE_STEP_LARGE } from '../src/components/Canvas/ResizeHandles'

function renderHandles() {
  const onResizeStart = vi.fn()
  const onResizeByKeyboard = vi.fn()
  render(
    <ResizeHandles
      onResizeStart={onResizeStart}
      onResizeByKeyboard={onResizeByKeyboard}
    />
  )
  return { onResizeStart, onResizeByKeyboard }
}

describe('ResizeHandles', () => {
  it('offers a handle on every corner and edge, named in plain words', () => {
    renderHandles()

    for (const name of [
      'Resize from top left corner',
      'Resize from top edge',
      'Resize from top right corner',
      'Resize from right edge',
      'Resize from bottom right corner',
      'Resize from bottom edge',
      'Resize from bottom left corner',
      'Resize from left edge',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('starts a pointer resize from the handle that was grabbed', () => {
    const { onResizeStart } = renderHandles()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Resize from bottom right corner' }))

    expect(onResizeStart).toHaveBeenCalledWith('se', expect.anything())
  })

  it('is reachable by keyboard', () => {
    renderHandles()
    const handle = screen.getByRole('button', { name: 'Resize from right edge' })

    handle.focus()

    expect(handle).toHaveFocus()
    expect(handle.tagName).toBe('BUTTON')
  })

  it('resizes with the arrow keys', () => {
    const { onResizeByKeyboard } = renderHandles()
    const handle = screen.getByRole('button', { name: 'Resize from right edge' })

    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(onResizeByKeyboard).toHaveBeenCalledWith('e', { x: RESIZE_STEP, y: 0 })

    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(onResizeByKeyboard).toHaveBeenCalledWith('e', { x: -RESIZE_STEP, y: 0 })
  })

  it('moves vertically too', () => {
    const { onResizeByKeyboard } = renderHandles()
    const handle = screen.getByRole('button', { name: 'Resize from bottom edge' })

    fireEvent.keyDown(handle, { key: 'ArrowDown' })

    expect(onResizeByKeyboard).toHaveBeenCalledWith('s', { x: 0, y: RESIZE_STEP })
  })

  it('takes a bigger step with shift', () => {
    const { onResizeByKeyboard } = renderHandles()

    fireEvent.keyDown(screen.getByRole('button', { name: 'Resize from right edge' }), {
      key: 'ArrowRight',
      shiftKey: true,
    })

    expect(onResizeByKeyboard).toHaveBeenCalledWith('e', { x: RESIZE_STEP_LARGE, y: 0 })
  })

  it('ignores keys that are not arrows', () => {
    const { onResizeByKeyboard } = renderHandles()

    fireEvent.keyDown(screen.getByRole('button', { name: 'Resize from top edge' }), { key: 'a' })

    expect(onResizeByKeyboard).not.toHaveBeenCalled()
  })

  it('gives each handle the cursor for the axis it moves', () => {
    renderHandles()

    expect(screen.getByRole('button', { name: 'Resize from left edge' })).toHaveStyle({
      cursor: 'ew-resize',
    })
    expect(
      screen.getByRole('button', { name: 'Resize from bottom right corner' })
    ).toHaveStyle({ cursor: 'nwse-resize' })
  })
})
