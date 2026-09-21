import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { addElement, patchElement, removeElements } from '../src/lib/board-mutations'
import { createWhiteboardDoc, type BoardElement, type StickyElement } from '../src/types/whiteboard'

function sticky(id: string, text = ''): StickyElement {
  return {
    id,
    type: 'sticky',
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    zIndex: 1,
    text,
    color: '#FFF9B1',
    fontSize: 16,
    createdAt: 0,
    updatedAt: 0,
  }
}

function board() {
  return createWhiteboardDoc(new Y.Doc())
}

describe('addElement', () => {
  it('stores the element and appends it to the z-order', () => {
    const doc = board()

    addElement(doc, sticky('a'))
    addElement(doc, sticky('b'))

    expect(doc.elementsMap.get('a')?.id).toBe('a')
    expect(doc.elementOrder.toArray()).toEqual(['a', 'b'])
  })

  it('writes the map and the order in one transaction', () => {
    const doc = board()
    let transactions = 0
    doc.doc.on('afterTransaction', () => {
      transactions += 1
    })

    addElement(doc, sticky('a'))

    expect(transactions).toBe(1)
  })
})

describe('patchElement', () => {
  it('merges the patch and bumps updatedAt', () => {
    const doc = board()
    addElement(doc, sticky('a', 'before'))

    patchElement(doc, 'a', { text: 'after' } as Partial<BoardElement>, 999)

    expect(doc.elementsMap.get('a')).toMatchObject({ text: 'after', updatedAt: 999 })
  })

  it('leaves untouched fields alone', () => {
    const doc = board()
    addElement(doc, sticky('a', 'keep me'))

    patchElement(doc, 'a', { x: 42 } as Partial<BoardElement>, 1)

    expect(doc.elementsMap.get('a')).toMatchObject({ x: 42, text: 'keep me' })
  })

  it('is a no-op for an unknown id', () => {
    const doc = board()

    expect(() => patchElement(doc, 'missing', { x: 1 } as Partial<BoardElement>, 1)).not.toThrow()
    expect(doc.elementsMap.size).toBe(0)
  })
})

describe('removeElements', () => {
  it('deletes from both the map and the z-order', () => {
    const doc = board()
    addElement(doc, sticky('a'))
    addElement(doc, sticky('b'))
    addElement(doc, sticky('c'))

    removeElements(doc, ['b'])

    expect(doc.elementsMap.has('b')).toBe(false)
    expect(doc.elementOrder.toArray()).toEqual(['a', 'c'])
  })

  it('removes several elements at once', () => {
    const doc = board()
    addElement(doc, sticky('a'))
    addElement(doc, sticky('b'))
    addElement(doc, sticky('c'))

    removeElements(doc, ['a', 'c'])

    expect(doc.elementsMap.size).toBe(1)
    expect(doc.elementOrder.toArray()).toEqual(['b'])
  })

  it('ignores ids that are not on the board', () => {
    const doc = board()
    addElement(doc, sticky('a'))

    expect(() => removeElements(doc, ['ghost'])).not.toThrow()
    expect(doc.elementOrder.toArray()).toEqual(['a'])
  })

  it('syncs the deletion to a peer document', () => {
    const local = board()
    const remote = board()
    local.doc.on('update', (update) => Y.applyUpdate(remote.doc, update))

    addElement(local, sticky('a'))
    addElement(local, sticky('b'))
    removeElements(local, ['a'])

    expect(remote.elementsMap.has('a')).toBe(false)
    expect(remote.elementOrder.toArray()).toEqual(['b'])
  })
})
