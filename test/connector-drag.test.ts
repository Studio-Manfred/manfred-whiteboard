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

// 240×40, so a label at (500,0) has anchors at (620,0) (740,20) (620,40) (500,20).
function label(id: string, x: number, y: number): BoardElement {
  return {
    id,
    type: 'text',
    x,
    y,
    width: 240,
    height: 40,
    zIndex: 1,
    text: 'hello',
    fontSize: 20,
    createdAt: 0,
    updatedAt: 0,
  }
}

function frame(id: string, x: number, y: number): BoardElement {
  return {
    id,
    type: 'frame',
    x,
    y,
    width: 400,
    height: 300,
    zIndex: 1,
    title: 'Frame 1',
    fillColor: '#ffffff',
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

  it('gives a text object the same four edge midpoints', () => {
    // Geometry only — nothing here reads the element type, which is why text
    // needs no arithmetic of its own.
    const anchors = elementAnchors(label('t', 500, 0))

    expect(anchors).toHaveLength(4)
    expect(anchors.find((c) => c.anchor === 'top')!.point).toEqual({ x: 620, y: 0 })
    expect(anchors.find((c) => c.anchor === 'right')!.point).toEqual({ x: 740, y: 20 })
    expect(anchors.find((c) => c.anchor === 'bottom')!.point).toEqual({ x: 620, y: 40 })
    expect(anchors.find((c) => c.anchor === 'left')!.point).toEqual({ x: 500, y: 20 })
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

  it('treats a text object as a valid endpoint', () => {
    const withText = new Map<string, BoardElement>([
      ['a', note('a', 0, 0)],
      ['t', label('t', 500, 0)],
    ])

    // 5 world units short of the label's left anchor at (500,20).
    const target = findSnapTarget(withText, { x: 495, y: 20 }, { excludeId: 'a' })

    expect(target).toMatchObject({ elementId: 't', anchor: 'left' })
    expect(target!.point).toEqual({ x: 500, y: 20 })
  })

  it('snaps to a text object released over its body, as it does for a note', () => {
    const withText = new Map<string, BoardElement>([
      ['a', note('a', 0, 0)],
      ['t', label('t', 500, 0)],
    ])

    // Inside the label, nearest its top edge.
    const target = findSnapTarget(withText, { x: 620, y: 12 }, { excludeId: 'a' })

    expect(target).toMatchObject({ elementId: 't', anchor: 'top' })
  })

  it('still refuses frames and drawings, which have geometry but are not endpoints', () => {
    // The negative half of the gate. Both have real x/y/width/height, so
    // nothing downstream would object to snapping to them — only the type
    // gate keeps them out, and widening it for text must not widen it here.
    const mixed = new Map<string, BoardElement>([
      ['a', note('a', 0, 0)],
      ['f', frame('f', 500, 0)],
      ['ink', ink('ink')],
    ])

    // Right on the frame's left anchor (500,150) and inside its body.
    expect(findSnapTarget(mixed, { x: 500, y: 150 }, { excludeId: 'a' })).toBeNull()
    expect(findSnapTarget(mixed, { x: 700, y: 150 }, { excludeId: 'a' })).toBeNull()
    // Right on the stroke's left anchor (0,625).
    expect(findSnapTarget(mixed, { x: 0, y: 625 }, { excludeId: 'a' })).toBeNull()
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
