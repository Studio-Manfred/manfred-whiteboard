import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ShapeItem } from '../src/components/Canvas/ShapeItem'
import type { ShapeElement } from '../src/types/whiteboard'

const rectangle: ShapeElement = {
  id: 'shape-1',
  type: 'shape',
  shapeType: 'rectangle',
  x: 40,
  y: 60,
  width: 120,
  height: 100,
  zIndex: 1,
  fillColor: 'transparent',
  strokeColor: '#0f172a',
  strokeWidth: 2,
  createdAt: 0,
  updatedAt: 0,
}

function renderShape(overrides: Partial<ShapeElement> = {}, props: Record<string, unknown> = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onUpdate: vi.fn(),
    onDragStart: vi.fn(),
    ...props,
  }
  const element = { ...rectangle, ...overrides }
  render(<ShapeItem element={element} isSelected={false} {...handlers} {...props} />)
  return { handlers, element, node: screen.getByTestId(`shape-${element.id}`) }
}

describe('ShapeItem', () => {
  it('positions and sizes itself in world coordinates', () => {
    const { node } = renderShape()

    expect(node).toHaveStyle({ left: '40px', top: '60px', width: '120px', height: '100px' })
  })

  it('draws a rounded rect for a rectangle and an ellipse for a circle', () => {
    const { container } = render(
      <ShapeItem
        element={rectangle}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
      />
    )
    expect(container.querySelector('rect')).toBeInTheDocument()
    expect(container.querySelector('ellipse')).not.toBeInTheDocument()

    const circle = render(
      <ShapeItem
        element={{ ...rectangle, id: 'shape-2', shapeType: 'circle' }}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
      />
    )
    expect(circle.container.querySelector('ellipse')).toBeInTheDocument()
  })

  it('selects and starts a drag on pointer down', () => {
    const { handlers, node } = renderShape()

    fireEvent.pointerDown(node)

    expect(handlers.onSelect).toHaveBeenCalledOnce()
    expect(handlers.onDragStart).toHaveBeenCalledOnce()
  })

  it('shows its label when it has one', () => {
    renderShape({ text: 'Discovery' })

    expect(screen.getByText('Discovery')).toBeInTheDocument()
  })

  it('edits the label on double click and commits it on blur', () => {
    const { handlers, node } = renderShape({ text: 'Before' })

    fireEvent.doubleClick(node)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'After' } })
    fireEvent.blur(input)

    expect(handlers.onUpdate).toHaveBeenCalledWith({ text: 'After' })
  })

  it('commits the label on Enter', () => {
    const { handlers, node } = renderShape({ text: '' })

    fireEvent.doubleClick(node)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Typed' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })

    expect(handlers.onUpdate).toHaveBeenCalledWith({ text: 'Typed' })
  })

  it('does not write back when the label is unchanged', () => {
    const { handlers, node } = renderShape({ text: 'Same' })

    fireEvent.doubleClick(node)
    fireEvent.blur(screen.getByRole('textbox'))

    expect(handlers.onUpdate).not.toHaveBeenCalled()
  })

  it('does not start a drag while the label is being edited', () => {
    const { handlers, node } = renderShape()

    fireEvent.doubleClick(node)
    fireEvent.pointerDown(node)

    expect(handlers.onDragStart).not.toHaveBeenCalled()
  })

  it('offers a labelled connection anchor on each side', () => {
    renderShape()

    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(
        screen.getByRole('button', { name: `Connect from ${side} anchor` })
      ).toBeInTheDocument()
    }
  })

  it('starts an arrow from an anchor without also selecting the shape', () => {
    const onAnchorDragStart = vi.fn()
    const { handlers } = renderShape({}, { onAnchorDragStart })

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Connect from right anchor' }))

    expect(onAnchorDragStart).toHaveBeenCalledWith('right', expect.anything())
    expect(handlers.onSelect).not.toHaveBeenCalled()
  })

  it('shows resize handles only when selected and resizable', () => {
    const onResizeStart = vi.fn()
    const { rerender } = render(
      <ShapeItem
        element={rectangle}
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
      <ShapeItem
        element={rectangle}
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

  it('picks up a label changed by another collaborator', () => {
    const { rerender } = render(
      <ShapeItem
        element={rectangle}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
      />
    )

    rerender(
      <ShapeItem
        element={{ ...rectangle, text: 'Remote edit' }}
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
      <ShapeItem
        element={rectangle}
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
      <ShapeItem
        element={rectangle}
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
      <ShapeItem
        element={rectangle}
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
      <ShapeItem
        element={rectangle}
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
  it('keeps its label off the border', () => {
    render(
      <ShapeItem
        element={{ ...rectangle, text: 'Label' }}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
      />
    )

    const wrapper = screen.getByText('Label').parentElement as HTMLElement
    expect(parseFloat(wrapper.style.paddingLeft)).toBeGreaterThan(8)
  })

  it('pushes the label further in as the border thickens', () => {
    const paddingFor = (strokeWidth: number) => {
      cleanup()
      render(
        <ShapeItem
          element={{ ...rectangle, text: 'Label', strokeWidth }}
          isSelected={false}
          onSelect={vi.fn()}
          onUpdate={vi.fn()}
          onDragStart={vi.fn()}
        />
      )
      const wrapper = screen.getByText('Label').parentElement as HTMLElement
      return parseFloat(wrapper.style.paddingLeft)
    }

    // The stroke is drawn half inside the shape, so a thick border would
    // otherwise crowd the text against the edge.
    expect(paddingFor(16)).toBeGreaterThan(paddingFor(2))
  })
  it('carries a shadow that follows its outline, not a box around it', () => {
    const { container } = render(
      <ShapeItem
        element={{ ...rectangle, shapeType: 'circle' }}
        isSelected={false}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onDragStart={vi.fn()}
      />
    )

    // A box shadow would be rectangular even around a circle.
    const svg = container.querySelector('svg') as SVGElement
    expect(svg.style.filter).toContain('drop-shadow')
    expect(screen.getByTestId('shape-shape-1').className).not.toContain('shadow-')
  })

  it('lifts as it is selected and again as it is moved', () => {
    const blurOf = (props: { isSelected: boolean; isDragging?: boolean }) => {
      cleanup()
      const { container } = render(
        <ShapeItem
          element={rectangle}
          onSelect={vi.fn()}
          onUpdate={vi.fn()}
          onDragStart={vi.fn()}
          {...props}
        />
      )
      const filter = (container.querySelector('svg') as SVGElement).style.filter
      return Number(filter.match(/0 \d+px (\d+)px/)![1])
    }

    const resting = blurOf({ isSelected: false })
    const selected = blurOf({ isSelected: true })
    const dragging = blurOf({ isSelected: true, isDragging: true })

    expect(selected).toBeGreaterThan(resting)
    expect(dragging).toBeGreaterThan(selected)
  })
})
