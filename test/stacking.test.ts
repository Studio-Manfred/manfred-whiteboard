import { describe, it, expect } from 'vitest'
import { orderedIds, restack, zIndexPatches } from '../src/lib/stacking'
import type { BoardElement } from '../src/types/whiteboard'

function note(id: string, zIndex: number, createdAt = 0): BoardElement {
  return {
    id, type: 'sticky', x: 0, y: 0, width: 100, height: 100, zIndex,
    text: '', color: '#FFF9B1', fontSize: 16, createdAt, updatedAt: 0,
  }
}

function board(...elements: BoardElement[]) {
  return new Map(elements.map((el) => [el.id, el]))
}

describe('orderedIds', () => {
  it('sorts back to front', () => {
    expect(orderedIds(board(note('c', 3), note('a', 1), note('b', 2)))).toEqual(['a', 'b', 'c'])
  })

  it('breaks ties by creation time, so order never wobbles', () => {
    const tied = board(note('later', 1, 200), note('earlier', 1, 100))

    expect(orderedIds(tied)).toEqual(['earlier', 'later'])
  })

  it('handles an empty board', () => {
    expect(orderedIds(board())).toEqual([])
  })
})

describe('restack', () => {
  const order = ['a', 'b', 'c', 'd']

  it('brings a selection to the front', () => {
    expect(restack(order, new Set(['b']), 'front')).toEqual(['a', 'c', 'd', 'b'])
  })

  it('sends a selection to the back', () => {
    expect(restack(order, new Set(['c']), 'back')).toEqual(['c', 'a', 'b', 'd'])
  })

  it('moves one step forward', () => {
    expect(restack(order, new Set(['b']), 'forward')).toEqual(['a', 'c', 'b', 'd'])
  })

  it('moves one step backward', () => {
    expect(restack(order, new Set(['c']), 'backward')).toEqual(['a', 'c', 'b', 'd'])
  })

  it('does nothing when the selection is already at the front', () => {
    expect(restack(order, new Set(['d']), 'forward')).toEqual(order)
    expect(restack(order, new Set(['d']), 'front')).toEqual(order)
  })

  it('does nothing when the selection is already at the back', () => {
    expect(restack(order, new Set(['a']), 'backward')).toEqual(order)
    expect(restack(order, new Set(['a']), 'back')).toEqual(order)
  })

  it('keeps the relative order of several selected elements', () => {
    expect(restack(order, new Set(['a', 'c']), 'front')).toEqual(['b', 'd', 'a', 'c'])
    expect(restack(order, new Set(['b', 'd']), 'back')).toEqual(['b', 'd', 'a', 'c'])
  })

  it('steps a whole group together', () => {
    expect(restack(order, new Set(['a', 'b']), 'forward')).toEqual(['c', 'a', 'b', 'd'])
  })

  it('leaves everything alone when nothing is selected', () => {
    expect(restack(order, new Set(), 'front')).toEqual(order)
  })

  it('ignores ids that are not on the board', () => {
    expect(restack(order, new Set(['ghost']), 'front')).toEqual(order)
  })

  it('cannot lose or duplicate an element', () => {
    for (const command of ['front', 'forward', 'backward', 'back'] as const) {
      const result = restack(order, new Set(['b', 'c']), command)

      expect([...result].sort()).toEqual([...order].sort())
    }
  })
})

describe('zIndexPatches', () => {
  it('renumbers by position', () => {
    const elements = board(note('a', 5), note('b', 9), note('c', 12))

    expect(zIndexPatches(['c', 'a', 'b'], elements)).toEqual(
      new Map([
        ['c', 0],
        ['a', 1],
        ['b', 2],
      ])
    )
  })

  it('leaves out elements whose position has not changed', () => {
    const elements = board(note('a', 0), note('b', 1), note('c', 2))

    expect(zIndexPatches(['a', 'b', 'c'], elements)).toEqual(new Map())
  })

  it('touches only what moved', () => {
    const elements = board(note('a', 0), note('b', 1), note('c', 2))

    expect(zIndexPatches(['a', 'c', 'b'], elements)).toEqual(
      new Map([
        ['c', 1],
        ['b', 2],
      ])
    )
  })
})
