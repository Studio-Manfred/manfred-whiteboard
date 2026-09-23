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

  it('prompts the reader when the note is still empty', () => {
    render(
      <StickyNote
        element={{ ...sampleSticky, text: '' }}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
      />
    )

    expect(screen.getByText('Double-click to write...')).toBeInTheDocument()
  })

  it('positions itself in world coordinates', () => {
    render(
      <StickyNote
        element={sampleSticky}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
      />
    )

    expect(screen.getByTestId('sticky-sticky-1')).toHaveStyle({
      left: '100px',
      top: '100px',
      width: '200px',
      height: '200px',
    })
  })

  it('selects and starts a drag on pointer down', () => {
    const onSelect = vi.fn()
    const onDragStart = vi.fn()
    render(
      <StickyNote
        element={sampleSticky}
        isSelected={false}
        onSelect={onSelect}
        onUpdate={vi.fn()}
        onDragStart={onDragStart}
      />
    )

    fireEvent.pointerDown(screen.getByTestId('sticky-sticky-1'))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onDragStart).toHaveBeenCalledOnce()
  })

  it('does not drag the note while its text is being edited', () => {
    const onDragStart = vi.fn()
    render(
      <StickyNote
        element={sampleSticky}
        isSelected={true}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={onDragStart}
      />
    )

    fireEvent.doubleClick(screen.getByTestId('sticky-sticky-1'))
    fireEvent.pointerDown(screen.getByTestId('sticky-sticky-1'))

    expect(onDragStart).not.toHaveBeenCalled()
  })

  it('abandons the edit on Escape without writing back', () => {
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

    fireEvent.doubleClick(screen.getByTestId('sticky-sticky-1'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Discarded' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })

    expect(handleUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('Initial Idea')).toBeInTheDocument()
  })

  it('does not write back when the text is unchanged', () => {
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

    fireEvent.doubleClick(screen.getByTestId('sticky-sticky-1'))
    fireEvent.blur(screen.getByRole('textbox'))

    expect(handleUpdate).not.toHaveBeenCalled()
  })

  it('offers a labelled connection anchor on each side', () => {
    const onAnchorDragStart = vi.fn()
    render(
      <StickyNote
        element={sampleSticky}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
        onAnchorDragStart={onAnchorDragStart}
      />
    )

    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(
        screen.getByRole('button', { name: `Connect from ${side} anchor` })
      ).toBeInTheDocument()
    }

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Connect from bottom anchor' }))
    expect(onAnchorDragStart).toHaveBeenCalledWith('bottom', expect.anything())
  })

  it('shows resize handles only when selected and resizable', () => {
    const onResizeStart = vi.fn()
    const { rerender } = render(
      <StickyNote
        element={sampleSticky}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
        onResizeStart={onResizeStart}
        onResizeByKeyboard={vi.fn()}
      />
    )
    expect(
      screen.queryByRole('button', { name: /^Resize from/ })
    ).not.toBeInTheDocument()

    rerender(
      <StickyNote
        element={sampleSticky}
        isSelected={true}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
        onResizeStart={onResizeStart}
        onResizeByKeyboard={vi.fn()}
      />
    )
    expect(screen.getAllByRole('button', { name: /^Resize from/ })).toHaveLength(8)
    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Resize from bottom right corner' })
    )
    expect(onResizeStart).toHaveBeenCalledWith('se', expect.anything())
  })

  it('picks up text changed by another collaborator', () => {
    const { rerender } = render(
      <StickyNote
        element={sampleSticky}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
      />
    )

    rerender(
      <StickyNote
        element={{ ...sampleSticky, text: 'Remote edit' }}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
      />
    )

    expect(screen.getByText('Remote edit')).toBeInTheDocument()
  })
  it('does not select or drag the element when an anchor is pressed', () => {
    const onSelect = vi.fn()
    const onDragStart = vi.fn()
    render(
      <StickyNote
        element={sampleSticky}
        isSelected={false}
        onSelect={onSelect}
        onUpdate={vi.fn()}
        onDragStart={onDragStart}
        onAnchorDragStart={vi.fn()}
      />
    )

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Connect from right anchor' })
    )

    expect(onSelect).not.toHaveBeenCalled()
    expect(onDragStart).not.toHaveBeenCalled()
  })
  it('starts dragging an arrow when an anchor is pressed', () => {
    const onAnchorDragStart = vi.fn()
    render(
      <StickyNote
        element={sampleSticky}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
        onAnchorDragStart={onAnchorDragStart}
      />
    )

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Connect from top anchor' }))

    expect(onAnchorDragStart).toHaveBeenCalledWith('top', expect.anything())
  })

  it('offers a keyboard route, since a drag is pointer-only', () => {
    const onAnchorKeyActivate = vi.fn()
    render(
      <StickyNote
        element={sampleSticky}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
        onAnchorKeyActivate={onAnchorKeyActivate}
      />
    )
    const anchor = screen.getByRole('button', { name: 'Connect from left anchor' })

    // detail 0 is how a browser reports Enter or Space on a button
    fireEvent.click(anchor, { detail: 0 })
    expect(onAnchorKeyActivate).toHaveBeenCalledWith('left')

    // a real mouse click carries detail >= 1 and must not double-fire
    onAnchorKeyActivate.mockClear()
    fireEvent.click(anchor, { detail: 1 })
    expect(onAnchorKeyActivate).not.toHaveBeenCalled()
  })

  it('shows its anchors on demand and marks the one an arrow would land on', () => {
    render(
      <StickyNote
        element={sampleSticky}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
        showAnchors
        highlightedAnchor="right"
      />
    )

    expect(screen.getByRole('button', { name: 'Connect from top anchor' }).className).toContain(
      'opacity-100'
    )
    expect(screen.getByRole('button', { name: 'Connect from right anchor' })).toHaveAttribute(
      'data-snap-target',
      'true'
    )
    expect(
      screen.getByRole('button', { name: 'Connect from top anchor' })
    ).not.toHaveAttribute('data-snap-target')
  })
  it('renders its text in the chosen size and family', () => {
    render(
      <StickyNote
        element={{ ...sampleSticky, fontSize: 24, fontFamily: 'serif' }}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
      />
    )

    const text = screen.getByText('Initial Idea')
    expect(text).toHaveStyle({ fontSize: '24px' })
    expect(text.style.fontFamily).toMatch(/serif/)
  })
})
