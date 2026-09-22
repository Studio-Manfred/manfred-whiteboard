import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SelectionOverlay } from '../src/components/Canvas/SelectionOverlay'

function marquee(start: { x: number; y: number }, current: { x: number; y: number }) {
  const { container } = render(<SelectionOverlay start={start} current={current} />)
  return (container.firstChild as HTMLElement).style
}

describe('SelectionOverlay', () => {
  it('spans from the start point to the current point', () => {
    const style = marquee({ x: 10, y: 20 }, { x: 110, y: 70 })

    expect(style.left).toBe('10px')
    expect(style.top).toBe('20px')
    expect(style.width).toBe('100px')
    expect(style.height).toBe('50px')
  })

  it('normalises a marquee dragged up and to the left', () => {
    const style = marquee({ x: 110, y: 70 }, { x: 10, y: 20 })

    expect(style.left).toBe('10px')
    expect(style.top).toBe('20px')
    expect(style.width).toBe('100px')
    expect(style.height).toBe('50px')
  })

  it('collapses to nothing when the pointer has not moved', () => {
    const style = marquee({ x: 40, y: 40 }, { x: 40, y: 40 })

    expect(style.width).toBe('0px')
    expect(style.height).toBe('0px')
  })
  it('is findable as the marquee', () => {
    const { getByTestId } = render(
      <SelectionOverlay start={{ x: 0, y: 0 }} current={{ x: 10, y: 10 }} />
    )

    expect(getByTestId('selection-marquee')).toBeInTheDocument()
  })
})
