import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StickyNote } from '../src/components/Canvas/StickyNote'
import type { StickyElement } from '../src/types/whiteboard'

describe('StickyNote Component', () => {
  const sampleSticky: StickyElement = {
    id: 'sticky-1',
    type: 'sticky',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    zIndex: 1,
    text: 'Initial Idea',
    color: '#FFF9B1',
    fontSize: 16,
    createdAt: 0,
    updatedAt: 0,
  }

  it('renders with initial text and background color', () => {
    render(
      <StickyNote
        element={sampleSticky}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
      />
    )

    expect(screen.getByText('Initial Idea')).toBeInTheDocument()
    const container = screen.getByTestId('sticky-sticky-1')
    expect(container).toHaveStyle({ backgroundColor: '#FFF9B1' })
  })

  it('switches to textarea on double click and calls onUpdate on blur', () => {
    const handleUpdate = vi.fn()
    render(
      <StickyNote
        element={sampleSticky}
        isSelected={true}
        onSelect={vi.fn()}
        onUpdate={handleUpdate}
        onDragStart={vi.fn()}
      />
    )

    const container = screen.getByTestId('sticky-sticky-1')
    fireEvent.doubleClick(container)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveValue('Initial Idea')

    fireEvent.change(textarea, { target: { value: 'Updated Brainstorm' } })
    fireEvent.blur(textarea)

    expect(handleUpdate).toHaveBeenCalledWith({ text: 'Updated Brainstorm' })
  })
})
