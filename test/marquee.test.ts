import { describe, it, expect } from 'vitest'
import { rectFromPoints, rectsIntersect, elementsInMarquee } from '../src/lib/marquee'
import type { BoardElement } from '../src/types/whiteboard'

function element(id: string, x: number, y: number, width = 100, height = 100): BoardElement {
  return {
    id,
    type: 'sticky',
    x,
    y,
    width,
    height,
    zIndex: 1,
    text: '',
    color: '#FFF9B1',
    fontSize: 16,
    createdAt: 0,
    updatedAt: 0,
  } as BoardElement
}

describe('rectFromPoints', () => {
  it('builds a rect from two corners', () => {
    expect(rectFromPoints({ x: 10, y: 20 }, { x: 110, y: 70 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    })
  })

  it('normalises a drag up and to the left', () => {
    expect(rectFromPoints({ x: 110, y: 70 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    })
  })

  it('collapses to zero for a single point', () => {
    expect(rectFromPoints({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({
      x: 5,
      y: 5,
      width: 0,
      height: 0,
    })
  })
})

describe('rectsIntersect', () => {
  const base = { x: 0, y: 0, width: 100, height: 100 }

  it('sees an overlap', () => {
    expect(rectsIntersect(base, { x: 50, y: 50, width: 100, height: 100 })).toBe(true)
  })

  it('sees containment, both ways round', () => {
    expect(rectsIntersect(base, { x: 10, y: 10, width: 10, height: 10 })).toBe(true)
    expect(rectsIntersect({ x: 10, y: 10, width: 10, height: 10 }, base)).toBe(true)
  })

  it('rejects rects that only touch edges', () => {
    expect(rectsIntersect(base, { x: 100, y: 0, width: 50, height: 50 })).toBe(false)
  })

  it('rejects rects that miss entirely', () => {
    expect(rectsIntersect(base, { x: 200, y: 200, width: 10, height: 10 })).toBe(false)
  })
})

describe('elementsInMarquee', () => {
  const elements = new Map<string, BoardElement>([
    ['a', element('a', 0, 0)],
    ['b', element('b', 200, 0)],
    ['c', element('c', 400, 400)],
  ])

  it('selects everything the marquee touches', () => {
    const hit = elementsInMarquee(elements, { x: 50, y: 50, width: 200, height: 50 })

    expect(hit.sort()).toEqual(['a', 'b'])
  })

  it('selects an element the marquee merely clips', () => {
    expect(elementsInMarquee(elements, { x: 90, y: 90, width: 20, height: 20 })).toEqual(['a'])
  })

  it('selects nothing for a marquee over empty canvas', () => {
    expect(elementsInMarquee(elements, { x: 700, y: 700, width: 50, height: 50 })).toEqual([])
  })

  it('selects nothing for a zero-size marquee, which is really a click', () => {
    expect(elementsInMarquee(elements, { x: 10, y: 10, width: 0, height: 0 })).toEqual([])
  })

  it('can sweep the whole board', () => {
    const hit = elementsInMarquee(elements, { x: -50, y: -50, width: 1000, height: 1000 })

    expect(hit).toHaveLength(3)
  })
})
