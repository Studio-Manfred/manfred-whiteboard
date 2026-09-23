import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DrawingItem } from '../src/components/Canvas/DrawingItem'
import type { DrawingElement } from '../src/types/whiteboard'

const stroke: DrawingElement = {
  id: 'd1',
  type: 'drawing',
  x: 100,
  y: 200,
  width: 80,
  height: 40,
  zIndex: 3,
  points: [
    { x: 100, y: 200 },
    { x: 140, y: 240 },
    { x: 180, y: 210 },
  ],
  strokeColor: '#ef4444',
  strokeWidth: 3,
  ink: 'pen',
  createdAt: 0,
  updatedAt: 0,
}

function renderItem(
  overrides: Partial<DrawingElement> = {},
  props: Partial<React.ComponentProps<typeof DrawingItem>> = {}
) {
  const handlers = {
    onSelect: vi.fn(),
    onDragStart: vi.fn(),
    onResizeStart: vi.fn(),
    onResizeByKeyboard: vi.fn(),
  }
  const view = render(
    <DrawingItem
      element={{ ...stroke, ...overrides }}
      isSelected={false}
      {...handlers}
      {...props}
    />
  )
  return { handlers, ...view }
}

describe('DrawingItem', () => {
  it('sits in the world where the stroke is', () => {
    renderItem()
    const item = screen.getByTestId('drawing-d1')

    // Positioned at its bounds, with room for the stroke's own width.
    expect(parseFloat(item.style.left)).toBeLessThanOrEqual(stroke.x)
    expect(parseFloat(item.style.width)).toBeGreaterThanOrEqual(stroke.width)
  })

  it('draws pen ink as a filled outline', () => {
    const { container } = renderItem()
    const ink = container.querySelector('[data-ink="pen"]')!

    expect(ink.getAttribute('fill')).toBe('#ef4444')
    expect(ink.getAttribute('stroke')).toBeNull()
  })

  it('draws an older uniform stroke as a stroked line', () => {
    const { container } = renderItem({ ink: undefined })

    expect(container.querySelector('[data-ink="pen"]')).toBeNull()
    expect(container.querySelectorAll('path')[1].getAttribute('stroke')).toBe('#ef4444')
  })

  it('turns blue when selected', () => {
    const { container } = renderItem({}, { isSelected: true })

    expect(container.querySelector('[data-ink="pen"]')!.getAttribute('fill')).toBe('#3b82f6')
  })

  it('selects and starts a drag from its hit area', () => {
    const { handlers, container } = renderItem()
    const hitArea = container.querySelectorAll('path')[0]

    fireEvent.pointerDown(hitArea)

    expect(handlers.onSelect).toHaveBeenCalled()
    expect(handlers.onDragStart).toHaveBeenCalled()
  })

  it('keeps a fat hit area, since a tapered tail is too thin to click', () => {
    const { container } = renderItem({ strokeWidth: 1 })
    const hitArea = container.querySelectorAll('path')[0]

    expect(Number(hitArea.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(12)
    expect(hitArea.getAttribute('stroke')).toBe('transparent')
  })

  it('shows an outline when selected, since ink has no body to ring', () => {
    const { container } = renderItem({}, { isSelected: true })

    expect(container.querySelector('.border-dashed')).toBeInTheDocument()
  })

  it('offers resize handles only when selected', () => {
    const { rerender } = renderItem()
    expect(screen.queryByRole('button', { name: /^Resize from/ })).not.toBeInTheDocument()

    rerender(
      <DrawingItem
        element={stroke}
        isSelected={true}
        onSelect={vi.fn()}
        onDragStart={vi.fn()}
        onResizeStart={vi.fn()}
        onResizeByKeyboard={vi.fn()}
      />
    )

    expect(screen.getAllByRole('button', { name: /^Resize from/ })).toHaveLength(8)
  })

  it('reports which handle started a resize', () => {
    const { handlers } = renderItem({}, { isSelected: true })

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Resize from bottom right corner' })
    )

    expect(handlers.onResizeStart).toHaveBeenCalledWith('se', expect.anything())
  })

  it('lifts while being dragged', () => {
    const { container, rerender } = renderItem({}, { isSelected: true })
    const resting = (container.querySelector('svg') as SVGElement).style.filter

    rerender(
      <DrawingItem
        element={stroke}
        isSelected={true}
        isDragging={true}
        onSelect={vi.fn()}
        onDragStart={vi.fn()}
      />
    )

    expect((container.querySelector('svg') as SVGElement).style.filter).not.toBe(resting)
  })
})
