import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DrawingLayer } from '../src/components/Canvas/DrawingLayer'

function renderLayer(props: Partial<React.ComponentProps<typeof DrawingLayer>> = {}) {
  return render(
    <DrawingLayer activePoints={[]} activeColor="#0f172a" activeWidth={3} {...props} />
  )
}

describe('DrawingLayer', () => {
  it('shows nothing while no stroke is in progress', () => {
    renderLayer()

    expect(screen.queryByTestId('active-stroke')).not.toBeInTheDocument()
  })

  it('previews the stroke being drawn right now', () => {
    renderLayer({
      activePoints: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      activeColor: '#8b5cf6',
    })
    const preview = screen.getByTestId('active-stroke')

    // Pen ink varies in width, so it is filled rather than stroked.
    expect(preview.getAttribute('fill')).toBe('#8b5cf6')
    expect(preview.getAttribute('stroke')).toBeNull()
    expect(Number(preview.getAttribute('opacity'))).toBeLessThan(1)
  })

  it('previews with the same engine that commits the stroke', () => {
    renderLayer({
      activePoints: [
        { x: 0, y: 0 },
        { x: 20, y: 5 },
        { x: 40, y: 0 },
      ],
      activeWidth: 6,
    })

    // A closed outline, as a committed pen stroke is.
    expect(screen.getByTestId('active-stroke').getAttribute('d')!.trimEnd()).toMatch(/Z$/)
  })

  it('waits for a second point — one point is not a stroke', () => {
    renderLayer({ activePoints: [{ x: 0, y: 0 }] })

    expect(screen.queryByTestId('active-stroke')).not.toBeInTheDocument()
  })

  it('never intercepts pointer events', () => {
    const { container } = renderLayer()

    expect((container.firstChild as SVGElement).getAttribute('class')).toContain(
      'pointer-events-none'
    )
  })
})
