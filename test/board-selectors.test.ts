import { describe, it, expect } from 'vitest'
import { partitionElements, findElementAt } from '../src/lib/board-selectors'
import type { BoardElement } from '../src/types/whiteboard'

function element(partial: Partial<BoardElement> & { id: string; type: BoardElement['type'] }) {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 1,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  } as BoardElement
}

describe('partitionElements', () => {
  it('splits a board into its five rendered lists', () => {
    const elements = new Map<string, BoardElement>([
      ['s1', element({ id: 's1', type: 'sticky' })],
      ['r1', element({ id: 'r1', type: 'shape' })],
      ['c1', element({ id: 'c1', type: 'connector' })],
      ['d1', element({ id: 'd1', type: 'drawing' })],
      ['s2', element({ id: 's2', type: 'sticky' })],
    ])

    const { stickies, shapes, connectors, drawings } = partitionElements(elements)

    expect(stickies.map((e) => e.id)).toEqual(['s1', 's2'])
    expect(shapes.map((e) => e.id)).toEqual(['r1'])
    expect(connectors.map((e) => e.id)).toEqual(['c1'])
    expect(drawings.map((e) => e.id)).toEqual(['d1'])
  })

  it('gives text objects a layer of their own', () => {
    const textEl = element({ id: 't1', type: 'text' })

    const layers = partitionElements(new Map([[textEl.id, textEl]]))

    expect(layers.texts).toEqual([textEl])
  })

  it('ignores element types with no layer of their own', () => {
    const elements = new Map<string, BoardElement>([
      ['f1', element({ id: 'f1', type: 'frame' })],
    ])

    const result = partitionElements(elements)

    expect(result.stickies).toEqual([])
    expect(result.shapes).toEqual([])
    expect(result.connectors).toEqual([])
    expect(result.drawings).toEqual([])
    expect(result.texts).toEqual([])
  })

  it('returns empty lists for an empty board', () => {
    expect(partitionElements(new Map())).toEqual({
      stickies: [],
      shapes: [],
      connectors: [],
      drawings: [],
      texts: [],
    })
  })
})

describe('findElementAt', () => {
  const elements = new Map<string, BoardElement>([
    ['low', element({ id: 'low', type: 'sticky', x: 0, y: 0, width: 100, height: 100, zIndex: 1 })],
    ['high', element({ id: 'high', type: 'shape', x: 50, y: 50, width: 100, height: 100, zIndex: 5 })],
  ])

  it('finds the element under the point', () => {
    expect(findElementAt(elements, { x: 10, y: 10 })).toBe('low')
  })

  it('returns null when the point hits nothing', () => {
    expect(findElementAt(elements, { x: 500, y: 500 })).toBeNull()
  })

  it('picks the topmost element where they overlap', () => {
    expect(findElementAt(elements, { x: 75, y: 75 })).toBe('high')
  })

  it('treats the edges as inside', () => {
    expect(findElementAt(elements, { x: 0, y: 0 })).toBe('low')
    expect(findElementAt(elements, { x: 100, y: 100 })).not.toBeNull()
  })

  it('hit-tests a text element like any other', () => {
    // containsPoint reads only x/y/width/height, but this was never actually
    // exercised with type 'text' until now — an object that cannot be
    // clicked cannot be selected.
    const withText = new Map<string, BoardElement>([
      ['t1', element({ id: 't1', type: 'text', x: 0, y: 0, width: 100, height: 40, zIndex: 1 })],
    ])

    expect(findElementAt(withText, { x: 50, y: 20 })).toBe('t1')
  })
})
