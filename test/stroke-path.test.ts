import { describe, it, expect } from 'vitest'
import { pointsToSmoothPath } from '../src/lib/stroke-path'

describe('pointsToSmoothPath', () => {
  it('returns an empty string for no points', () => {
    expect(pointsToSmoothPath([])).toBe('')
  })

  it('renders a zero-length line for a single point (so a dot is visible)', () => {
    expect(pointsToSmoothPath([{ x: 10, y: 20 }])).toBe('M 10 20 L 10 20')
  })

  it('renders a straight line for exactly two points', () => {
    expect(
      pointsToSmoothPath([
        { x: 0, y: 0 },
        { x: 10, y: 5 },
      ])
    ).toBe('M 0 0 L 10 5')
  })

  it('smooths three or more points into cubic Bézier segments', () => {
    const d = pointsToSmoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ])

    expect(d.startsWith('M 0 0')).toBe(true)
    // one curve segment per gap between points
    expect(d.match(/ C /g)).toHaveLength(2)
    expect(d.endsWith('20 0')).toBe(true)
  })

  it('never emits NaN for repeated identical points', () => {
    const d = pointsToSmoothPath([
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ])

    expect(d).not.toContain('NaN')
  })
})
