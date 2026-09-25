import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TextItem } from '../src/components/Canvas/TextItem'
import type { TextElement } from '../src/types/whiteboard'

const text: TextElement = {
  id: 'x1', type: 'text', x: 0, y: 0, width: 100, height: 27,
  zIndex: 1, createdAt: 0, updatedAt: 0, text: 'hello', fontSize: 20,
}

const props = {
  isSelected: false,
  onSelect: vi.fn(),
  onUpdate: vi.fn(),
  onDragStart: vi.fn(),
}

describe('TextItem', () => {
  it('renders one element per laid-out line', () => {
    render(<TextItem element={{ ...text, text: 'hello world', width: 60 }} {...props} />)
    // jsdom cannot measure, so the estimate measurer runs — assert on the
    // count rather than on where exactly it broke.
    expect(screen.getAllByTestId('text-line').length).toBeGreaterThan(1)
  })

  it('writes the height back when the laid-out height differs', () => {
    const onUpdate = vi.fn()
    render(<TextItem element={{ ...text, height: 999 }} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ height: expect.any(Number) }))
    expect(onUpdate.mock.calls[0][0].height).not.toBe(999)
  })

  it('does not write the height back when it already agrees', () => {
    // Review Focus 5: a patch per keystroke would flood the undo stack.
    const onUpdate = vi.fn()
    const { rerender } = render(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    onUpdate.mockClear()
    rerender(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('recomputes the height when the font size changes', () => {
    // Review Focus 3: a stale height makes hit-testing lie.
    const onUpdate = vi.fn()
    const { rerender } = render(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    onUpdate.mockClear()
    rerender(<TextItem element={{ ...text, fontSize: 40 }} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ height: expect.any(Number) }))
  })

  it('corrects a stale height arriving from a peer', () => {
    // Review Focus 4: the text is the truth, the height is a cache.
    const onUpdate = vi.fn()
    render(<TextItem element={{ ...text, height: 4 }} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).toHaveBeenCalled()
  })

  it('renders textColor when set, and slate-800 when not', () => {
    const { rerender } = render(<TextItem element={text} {...props} />)
    expect(screen.getByTestId('text-body')).toHaveStyle({ color: 'rgb(30, 41, 59)' })

    rerender(<TextItem element={{ ...text, textColor: '#dc2626' }} {...props} />)
    expect(screen.getByTestId('text-body')).toHaveStyle({ color: '#dc2626' })
  })

  it('offers only the east and west resize handles', () => {
    render(<TextItem element={text} {...props} isSelected onResizeStart={vi.fn()} onResizeByKeyboard={vi.fn()} />)
    expect(screen.getByRole('button', { name: /right edge/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /left edge/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /bottom edge/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /corner/i })).not.toBeInTheDocument()
  })

  it('opens a textarea on double click and commits on blur', () => {
    const onUpdate = vi.fn()
    render(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    fireEvent.doubleClick(screen.getByTestId('text-body'))

    const box = screen.getByRole('textbox')
    fireEvent.change(box, { target: { value: 'changed' } })
    fireEvent.blur(box)

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ text: 'changed' }))
  })
})
