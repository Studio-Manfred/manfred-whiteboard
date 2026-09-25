import { describe, it, expect } from 'vitest'
import {
  resizePatchFor,
  RESIZE_HANDLES,
  MIN_ELEMENT_SIZE,
  resizeRect,
  cursorForHandle,
  handleAnchorPoint,
  handlesFor,
} from '../src/lib/resize'
import type { Rect } from '../src/lib/marquee'
import type { BoardElement } from '../src/types/whiteboard'

const base: Rect = { x: 100, y: 100, width: 200, height: 100 }

const textElement = {
  id: 't', type: 'text', zIndex: 1, createdAt: 0, updatedAt: 0,
  text: 'hi', fontSize: 16, ...base,
} as BoardElement

const stickyElement = {
  id: 'n', type: 'sticky', zIndex: 1, createdAt: 0, updatedAt: 0,
  text: '', color: '#FFF9B1', fontSize: 16, ...base,
} as BoardElement

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

  it('offers text only the horizontal handles', () => {
    expect(handlesFor(textElement)).toEqual(['e', 'w'])
  })

  it('offers every other element all eight', () => {
    expect(handlesFor(stickyElement)).toHaveLength(8)
  })

  it('never resizes text below the minimum width', () => {
    // The spec clamps to MIN_ELEMENT_SIZE; resizeRect already does, but nothing
    // asserted it held for an element whose height is not user-controlled.
    const next = resizeRect(textElement, 'w', { x: 10_000, y: 0 })
    expect(next.width).toBeGreaterThanOrEqual(MIN_ELEMENT_SIZE)
  })
})

describe('resizePatchFor', () => {
  const box = { x: 100, y: 100, width: 200, height: 100 }

  const ink = {
    id: 'd', type: 'drawing', zIndex: 1, createdAt: 0, updatedAt: 0,
    strokeColor: '#000', strokeWidth: 3, ...box,
    points: [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 150 },
    ],
  } as BoardElement

  const note = {
    id: 'n', type: 'sticky', zIndex: 1, createdAt: 0, updatedAt: 0,
    text: '', color: '#FFF9B1', fontSize: 16, ...box,
  } as BoardElement

  it('moves an element by its box alone', () => {
    const next = { x: 0, y: 0, width: 400, height: 200 }

    expect(resizePatchFor(note, next)).toEqual(next)
  })

  it('scales a stroke\'s points, since ink has no body to stretch', () => {
    const patch = resizePatchFor(ink, { x: 100, y: 100, width: 400, height: 100 }) as {
      points: Array<{ x: number; y: number }>
    }

    expect(patch.points).toEqual([
      { x: 100, y: 100 },
      { x: 300, y: 200 },
      { x: 500, y: 150 },
    ])
  })

  it('carries the new box along with the points', () => {
    const next = { x: 0, y: 0, width: 100, height: 50 }

    expect(resizePatchFor(ink, next)).toMatchObject(next)
  })
})

