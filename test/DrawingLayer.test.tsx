import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DrawingLayer } from '../src/components/Canvas/DrawingLayer'
import type { DrawingElement } from '../src/types/whiteboard'

function stroke(id: string, overrides: Partial<DrawingElement> = {}): DrawingElement {
  return {
    id,
    type: 'drawing',
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    zIndex: 1,
    points: [
      { x: 0, y: 0 },
      { x: 25, y: 40 },
      { x: 50, y: 10 },
    ],
    strokeColor: '#0f172a',
    strokeWidth: 3,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

function renderLayer(props: Partial<React.ComponentProps<typeof DrawingLayer>> = {}) {
  const onSelect = vi.fn()
  const view = render(
    <DrawingLayer
      drawings={[]}
      activePoints={[]}
      activeColor="#0f172a"
      activeWidth={3}
      selectedIds={new Set()}
      onSelect={onSelect}
      {...props}
    />
  )
  return { onSelect, ...view }
}

describe('DrawingLayer', () => {
  it('renders one group per committed stroke', () => {
    renderLayer({ drawings: [stroke('d1'), stroke('d2')] })

    expect(screen.getByTestId('drawing-d1')).toBeInTheDocument()
    expect(screen.getByTestId('drawing-d2')).toBeInTheDocument()
  })

  it('renders nothing but the canvas when the board has no ink', () => {
    const { container } = renderLayer()

    expect(container.querySelectorAll('path')).toHaveLength(0)
  })

  it('draws each stroke in its own colour and width', () => {
    const { container } = renderLayer({ drawings: [stroke('d1', { strokeColor: '#ef4444', strokeWidth: 8 })] })
    const visible = container.querySelectorAll('path')[1]

    expect(visible.getAttribute('stroke')).toBe('#ef4444')
    expect(visible.getAttribute('stroke-width')).toBe('8')
  })

  it('highlights a selected stroke', () => {
    const { container } = renderLayer({ drawings: [stroke('d1')], selectedIds: new Set(['d1']) })

    expect(container.querySelectorAll('path')[1].getAttribute('stroke')).toBe('#3b82f6')
  })

  it('gives every stroke a hit area at least as fat as the ink', () => {
    const { container } = renderLayer({ drawings: [stroke('d1', { strokeWidth: 20 })] })
    const hitArea = container.querySelectorAll('path')[0]

    expect(Number(hitArea.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(20)
    expect(hitArea.getAttribute('stroke')).toBe('transparent')
  })

  it('selects a stroke when its hit area is clicked', () => {
    const { onSelect, container } = renderLayer({ drawings: [stroke('d1')] })

    fireEvent.click(container.querySelectorAll('path')[0])

    expect(onSelect).toHaveBeenCalledWith('d1', expect.anything())
  })

  it('previews the stroke being drawn right now', () => {
    const { container } = renderLayer({
      activePoints: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      activeColor: '#8b5cf6',
      activeWidth: 5,
    })
    const preview = container.querySelectorAll('path')[0]

    expect(preview.getAttribute('stroke')).toBe('#8b5cf6')
    expect(preview.getAttribute('stroke-width')).toBe('5')
    expect(Number(preview.getAttribute('opacity'))).toBeLessThan(1)
  })

  it('waits for a second point before previewing — one point is not a stroke', () => {
    const { container } = renderLayer({ activePoints: [{ x: 0, y: 0 }] })

    expect(container.querySelectorAll('path')).toHaveLength(0)
  })
})
