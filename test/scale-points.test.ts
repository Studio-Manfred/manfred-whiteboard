import { describe, it, expect } from 'vitest'
import { scalePoints, translatePoints } from '../src/lib/scale-points'
import type { InkPoint } from '../src/lib/ink'

const from = { x: 0, y: 0, width: 100, height: 100 }
const points: InkPoint[] = [
  { x: 0, y: 0 },
  { x: 50, y: 100 },
  { x: 100, y: 50 },
]

describe('scalePoints', () => {
  it('leaves points alone when the box does not change', () => {
    expect(scalePoints(points, from, from)).toEqual(points)
  })

  it('stretches points with the box', () => {
    expect(scalePoints(points, from, { x: 0, y: 0, width: 200, height: 100 })).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 50 },
    ])
  })

  it('moves points with the box', () => {
    expect(scalePoints(points, from, { x: 30, y: 10, width: 100, height: 100 })).toEqual([
      { x: 30, y: 10 },
      { x: 80, y: 110 },
      { x: 130, y: 60 },
    ])
  })

  it('shrinks and moves at once', () => {
    expect(scalePoints(points, from, { x: 10, y: 10, width: 50, height: 50 })).toEqual([
      { x: 10, y: 10 },
      { x: 35, y: 60 },
      { x: 60, y: 35 },
    ])
  })

  it('keeps stylus pressure untouched — geometry changed, not the hand', () => {
    const withPressure: InkPoint[] = [
      { x: 0, y: 0, p: 0.2 },
      { x: 100, y: 100, p: 0.9 },
    ]

    expect(scalePoints(withPressure, from, { x: 0, y: 0, width: 50, height: 50 })).toEqual([
      { x: 0, y: 0, p: 0.2 },
      { x: 50, y: 50, p: 0.9 },
    ])
  })

  it('survives a flat box, which a straight line has', () => {
    // A perfectly horizontal stroke has zero height; scaling must not divide by it.
    const flat = [
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ]
    const scaled = scalePoints(flat, { x: 0, y: 50, width: 100, height: 0 }, {
      x: 0,
      y: 50,
      width: 200,
      height: 0,
    })

    expect(scaled).toEqual([
      { x: 0, y: 50 },
      { x: 200, y: 50 },
    ])
    expect(JSON.stringify(scaled)).not.toContain('null')
  })

  it('never produces NaN', () => {
    const scaled = scalePoints(points, { x: 0, y: 0, width: 0, height: 0 }, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })

    expect(scaled.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
  })

  it('copes with no points', () => {
    expect(scalePoints([], from, from)).toEqual([])
  })
})

describe('translatePoints', () => {
  it('moves every point by the same offset', () => {
    expect(translatePoints(points, 10, -5)).toEqual([
      { x: 10, y: -5 },
      { x: 60, y: 95 },
      { x: 110, y: 45 },
    ])
  })

  it('leaves points alone for a zero offset', () => {
    expect(translatePoints(points, 0, 0)).toEqual(points)
  })

  it('keeps stylus pressure, which a move does not change', () => {
    expect(translatePoints([{ x: 0, y: 0, p: 0.7 }], 5, 5)).toEqual([{ x: 5, y: 5, p: 0.7 }])
  })

  it('copes with no points', () => {
    expect(translatePoints([], 10, 10)).toEqual([])
  })
})

