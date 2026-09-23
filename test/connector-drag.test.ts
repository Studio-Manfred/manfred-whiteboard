import { describe, it, expect } from 'vitest'
import { elementAnchors, findSnapTarget, SNAP_RADIUS } from '../src/lib/connector-drag'
import type { BoardElement } from '../src/types/whiteboard'

function note(id: string, x: number, y: number): BoardElement {
  return {
    id,
    type: 'sticky',
    x,
    y,
    width: 200,
    height: 200,
    zIndex: 1,
    text: '',
    color: '#FFF9B1',
    fontSize: 16,
    createdAt: 0,
    updatedAt: 0,
  }
}

function ink(id: string): BoardElement {
  return {
    id,
    type: 'drawing',
    x: 0,
    y: 600,
    width: 100,
    height: 50,
    zIndex: 1,
    points: [],
    strokeColor: '#000',
    strokeWidth: 2,
    createdAt: 0,
    updatedAt: 0,
  }
}

function arrow(id: string): BoardElement {
  return {
    id,
    type: 'connector',
    fromId: 'a',
    toId: 'b',
    fromAnchor: 'right',
    toAnchor: 'left',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    zIndex: 1,
    strokeColor: '#475569',
    strokeWidth: 2,
    style: 'curved',
    createdAt: 0,
    updatedAt: 0,
  }
}

// A note at (0,0) 200×200 has anchors at (100,0) (200,100) (100,200) (0,100).
const board = new Map<string, BoardElement>([
  ['a', note('a', 0, 0)],
  ['b', note('b', 500, 0)],
])

describe('elementAnchors', () => {
  it('gives the four edge midpoints', () => {
    const anchors = elementAnchors(note('a', 0, 0))

    expect(anchors).toHaveLength(4)
    expect(anchors.find((c) => c.anchor === 'top')!.point).toEqual({ x: 100, y: 0 })
    expect(anchors.find((c) => c.anchor === 'right')!.point).toEqual({ x: 200, y: 100 })
    expect(anchors.find((c) => c.anchor === 'bottom')!.point).toEqual({ x: 100, y: 200 })
    expect(anchors.find((c) => c.anchor === 'left')!.point).toEqual({ x: 0, y: 100 })
  })

  it('carries the element id on every candidate', () => {
    expect(elementAnchors(note('a', 0, 0)).every((c) => c.elementId === 'a')).toBe(true)
  })
})

describe('findSnapTarget', () => {
  it('snaps to an anchor the pointer is near', () => {
    const target = findSnapTarget(board, { x: 495, y: 100 }, { excludeId: 'a' })

    expect(target).toMatchObject({ elementId: 'b', anchor: 'left' })
    expect(target!.point).toEqual({ x: 500, y: 100 })
  })

  it('ignores anchors further away than the snap radius', () => {
    expect(
      findSnapTarget(board, { x: 500 - SNAP_RADIUS - 30, y: 100 }, { excludeId: 'a' })
    ).toBeNull()
  })

  it('picks the nearest anchor when several are in range', () => {
    // Just outside b's top-left: closer to its left anchor than its top one.
    const target = findSnapTarget(board, { x: 495, y: 90 }, { excludeId: 'a' })

    expect(target!.anchor).toBe('left')
  })

  it('never snaps back to the element the drag started from', () => {
    // Right on a's own right anchor.
    expect(findSnapTarget(board, { x: 200, y: 100 }, { excludeId: 'a' })).toBeNull()
  })

  it('snaps to the nearest anchor when released over an element body', () => {
    // Deep inside b, far from any anchor, but nearest the top edge.
    const target = findSnapTarget(board, { x: 600, y: 40 }, { excludeId: 'a' })

    expect(target).toMatchObject({ elementId: 'b', anchor: 'top' })
  })

  it('treats ink and connectors as invalid endpoints', () => {
    const odd = new Map<string, BoardElement>([
      ['a', note('a', 0, 0)],
      ['ink', ink('ink')],
      ['arrow', arrow('arrow')],
    ])

    expect(findSnapTarget(odd, { x: 50, y: 620 }, { excludeId: 'a' })).toBeNull()
    expect(findSnapTarget(odd, { x: 0, y: 0 }, { excludeId: 'a' })).toBeNull()
  })

  it('returns null on an empty board', () => {
    expect(findSnapTarget(new Map(), { x: 0, y: 0 }, { excludeId: 'a' })).toBeNull()
  })

  it('reports how far the snap reached, so callers can show the strongest one', () => {
    const target = findSnapTarget(board, { x: 495, y: 100 }, { excludeId: 'a' })

    expect(target!.distance).toBeCloseTo(5)
  })

  it('honours a custom radius', () => {
    const pointer = { x: 460, y: 100 }

    expect(findSnapTarget(board, pointer, { excludeId: 'a', radius: 10 })).toBeNull()
    expect(findSnapTarget(board, pointer, { excludeId: 'a', radius: 60 })).not.toBeNull()
  })

  it('prefers the closest element when two are in range', () => {
    const crowded = new Map<string, BoardElement>([
      ['a', note('a', 0, 0)],
      ['b', note('b', 500, 0)],
      ['c', note('c', 260, 0)],
    ])

    // Near c's right anchor (460,100) and b's left anchor (500,100).
    const target = findSnapTarget(crowded, { x: 470, y: 100 }, { excludeId: 'a' })

    expect(target!.elementId).toBe('c')
  })
})
