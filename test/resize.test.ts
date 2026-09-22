import { describe, it, expect } from 'vitest'
import {
  RESIZE_HANDLES,
  MIN_ELEMENT_SIZE,
  resizeRect,
  cursorForHandle,
  handleAnchorPoint,
} from '../src/lib/resize'
import type { Rect } from '../src/lib/marquee'

const base: Rect = { x: 100, y: 100, width: 200, height: 100 }

describe('resizeRect', () => {
  it('grows to the right from the east edge, leaving the left alone', () => {
    expect(resizeRect(base, 'e', { x: 50, y: 0 })).toEqual({
      x: 100,
      y: 100,
      width: 250,
      height: 100,
    })
  })

  it('grows downward from the south edge', () => {
    expect(resizeRect(base, 's', { x: 0, y: 40 })).toEqual({
      x: 100,
      y: 100,
      width: 200,
      height: 140,
    })
  })

  it('moves the left edge when dragging west, keeping the right edge fixed', () => {
    const resized = resizeRect(base, 'w', { x: -50, y: 0 })

    expect(resized).toEqual({ x: 50, y: 100, width: 250, height: 100 })
    expect(resized.x + resized.width).toBe(base.x + base.width)
  })

  it('moves the top edge when dragging north', () => {
    const resized = resizeRect(base, 'n', { x: 0, y: -30 })

    expect(resized).toEqual({ x: 100, y: 70, width: 200, height: 130 })
    expect(resized.y + resized.height).toBe(base.y + base.height)
  })

  it('an edge handle never moves the other axis', () => {
    expect(resizeRect(base, 'e', { x: 20, y: 999 })).toMatchObject({ y: 100, height: 100 })
    expect(resizeRect(base, 'n', { x: 999, y: -20 })).toMatchObject({ x: 100, width: 200 })
  })

  it('a corner moves both of its edges', () => {
    expect(resizeRect(base, 'se', { x: 50, y: 25 })).toEqual({
      x: 100,
      y: 100,
      width: 250,
      height: 125,
    })
    expect(resizeRect(base, 'nw', { x: -50, y: -25 })).toEqual({
      x: 50,
      y: 75,
      width: 250,
      height: 125,
    })
  })

  it('keeps the opposite corner pinned', () => {
    const resized = resizeRect(base, 'ne', { x: 40, y: -20 })

    expect(resized.x).toBe(base.x)
    expect(resized.y + resized.height).toBe(base.y + base.height)
  })

  it('refuses to shrink below the minimum size', () => {
    const resized = resizeRect(base, 'e', { x: -1000, y: 0 })

    expect(resized.width).toBe(MIN_ELEMENT_SIZE)
    expect(resized.x).toBe(base.x)
  })

  it('stops a west drag at the minimum instead of flipping the element', () => {
    const resized = resizeRect(base, 'w', { x: 1000, y: 0 })

    expect(resized.width).toBe(MIN_ELEMENT_SIZE)
    // The right edge is still where it was, so the element never inverts.
    expect(resized.x + resized.width).toBe(base.x + base.width)
  })

  it('clamps both axes at once on a corner', () => {
    const resized = resizeRect(base, 'nw', { x: 1000, y: 1000 })

    expect(resized.width).toBe(MIN_ELEMENT_SIZE)
    expect(resized.height).toBe(MIN_ELEMENT_SIZE)
    expect(resized.x + resized.width).toBe(base.x + base.width)
    expect(resized.y + resized.height).toBe(base.y + base.height)
  })

  it('keeps the aspect ratio on a corner when asked', () => {
    const resized = resizeRect(base, 'se', { x: 100, y: 0 }, { preserveAspectRatio: true })

    expect(resized.width / resized.height).toBeCloseTo(base.width / base.height)
    expect(resized.width).toBeGreaterThan(base.width)
  })

  it('ignores an aspect-ratio request on an edge, which has only one axis', () => {
    expect(resizeRect(base, 'e', { x: 50, y: 0 }, { preserveAspectRatio: true })).toEqual(
      resizeRect(base, 'e', { x: 50, y: 0 })
    )
  })

  it('leaves the rect untouched for a zero delta', () => {
    expect(resizeRect(base, 'se', { x: 0, y: 0 })).toEqual(base)
  })
})

describe('the handles themselves', () => {
  it('offers four corners and four edges', () => {
    expect(RESIZE_HANDLES).toHaveLength(8)
    expect(RESIZE_HANDLES).toEqual(
      expect.arrayContaining(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'])
    )
  })

  it('points the cursor along the axis each handle moves', () => {
    expect(cursorForHandle('n')).toBe('ns-resize')
    expect(cursorForHandle('s')).toBe('ns-resize')
    expect(cursorForHandle('e')).toBe('ew-resize')
    expect(cursorForHandle('w')).toBe('ew-resize')
    expect(cursorForHandle('nw')).toBe('nwse-resize')
    expect(cursorForHandle('se')).toBe('nwse-resize')
    expect(cursorForHandle('ne')).toBe('nesw-resize')
    expect(cursorForHandle('sw')).toBe('nesw-resize')
  })

  it('places each handle on the edge it controls, as a fraction of the box', () => {
    expect(handleAnchorPoint('nw')).toEqual({ x: 0, y: 0 })
    expect(handleAnchorPoint('n')).toEqual({ x: 0.5, y: 0 })
    expect(handleAnchorPoint('se')).toEqual({ x: 1, y: 1 })
    expect(handleAnchorPoint('w')).toEqual({ x: 0, y: 0.5 })
  })
})
