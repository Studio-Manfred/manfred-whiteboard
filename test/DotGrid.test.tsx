import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DotGrid } from '../src/components/Canvas/DotGrid'

function grid(viewport: { x: number; y: number; zoom: number }) {
  const { container } = render(<DotGrid viewport={viewport} />)
  return container.firstChild as HTMLElement
}

describe('DotGrid', () => {
  it('scales the dot spacing with the zoom level', () => {
    expect(grid({ x: 0, y: 0, zoom: 1 }).style.backgroundSize).toBe('28px 28px')
    expect(grid({ x: 0, y: 0, zoom: 2 }).style.backgroundSize).toBe('56px 56px')
  })

  it('offsets the pattern so the grid appears to move with the canvas', () => {
    expect(grid({ x: 10, y: 4, zoom: 1 }).style.backgroundPosition).toBe('10px 4px')
  })

  it('wraps the offset into a positive range when panned negative', () => {
    // -10 against a 28px pattern reads as +18, not a negative offset.
    expect(grid({ x: -10, y: -10, zoom: 1 }).style.backgroundPosition).toBe('18px 18px')
  })

  it('fades out when zoomed far out and never disappears entirely', () => {
    expect(Number(grid({ x: 0, y: 0, zoom: 0.1 }).style.opacity)).toBe(0.2)
    expect(Number(grid({ x: 0, y: 0, zoom: 5 }).style.opacity)).toBe(0.8)
  })

  it('never intercepts pointer events', () => {
    expect(grid({ x: 0, y: 0, zoom: 1 }).className).toContain('pointer-events-none')
  })
})
