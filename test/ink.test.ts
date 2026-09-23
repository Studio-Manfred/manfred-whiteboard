import { describe, it, expect } from 'vitest'
import {
  penOutlinePath,
  isPenStroke,
  INK_SIZE_SCALE,
  type InkPoint,
} from '../src/lib/ink'
import type { DrawingElement } from '../src/types/whiteboard'

/**
 * Vertical extent of a path: how wide the ink is along a horizontal stroke.
 * The path is `M x y Q x y x y … Z`, so the y values are the odd numbers.
 */
function thickness(path: string): number {
  const numbers = Array.from(path.matchAll(/-?\d+(?:\.\d+)?/g)).map((m) => Number(m[0]))
  const ys = numbers.filter((_, index) => index % 2 === 1)

  return Math.max(...ys) - Math.min(...ys)
}

function line(count: number, spacing: number, pressure?: number): InkPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i * spacing,
    y: 100,
    ...(pressure === undefined ? {} : { p: pressure }),
  }))
}

describe('penOutlinePath', () => {
  it('draws nothing for no points', () => {
    expect(penOutlinePath([], 8)).toBe('')
  })

  it('draws a dot for a single point', () => {
    const path = penOutlinePath([{ x: 10, y: 10 }], 8)

    expect(path).not.toBe('')
    expect(path.trimEnd().endsWith('Z')).toBe(true)
  })

  it('produces a closed outline, since the stroke is filled rather than stroked', () => {
    expect(penOutlinePath(line(20, 5), 8).trimEnd().endsWith('Z')).toBe(true)
  })

  it('gets thicker as the base size grows', () => {
    expect(thickness(penOutlinePath(line(20, 5), 16))).toBeGreaterThan(
      thickness(penOutlinePath(line(20, 5), 4))
    )
  })

  it('is thicker when drawn slowly than when drawn fast', () => {
    // Same stroke sampled at the same rate: closely spaced points mean a slow
    // hand, widely spaced points a fast one.
    const slow = thickness(penOutlinePath(line(24, 2), 10))
    const fast = thickness(penOutlinePath(line(24, 40), 10))

    expect(slow).toBeGreaterThan(fast)
  })

  it('honours a real stylus pressure when one was recorded', () => {
    const hard = thickness(penOutlinePath(line(24, 6, 1), 10))
    const soft = thickness(penOutlinePath(line(24, 6, 0.15), 10))

    expect(hard).toBeGreaterThan(soft)
  })

  it('is deterministic, so a stroke looks the same on every peer', () => {
    const points = line(20, 5)

    expect(penOutlinePath(points, 8)).toBe(penOutlinePath(points, 8))
  })

  it('never emits NaN', () => {
    expect(penOutlinePath(line(12, 0), 8)).not.toContain('NaN')
  })

  it('renders a line at least as wide as the thickness asked for', () => {
    // perfect-freehand's size is a base diameter that thinning cuts into, so
    // an unscaled 3px setting came out as a hairline.
    const width = 3
    const drawn = thickness(penOutlinePath(line(24, 8), width))

    expect(INK_SIZE_SCALE).toBeGreaterThan(1)
    expect(drawn).toBeGreaterThanOrEqual(width)
  })
})

describe('isPenStroke', () => {
  const base = {
    id: 'd', type: 'drawing', x: 0, y: 0, width: 10, height: 10, zIndex: 1,
    points: [], strokeColor: '#000', strokeWidth: 3, createdAt: 0, updatedAt: 0,
  } as DrawingElement

  it('treats a stroke drawn before the pen existed as the old uniform line', () => {
    expect(isPenStroke(base)).toBe(false)
  })

  it('recognises a pen stroke', () => {
    expect(isPenStroke({ ...base, ink: 'pen' })).toBe(true)
  })
})
