import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { addElement, patchElement, removeElements } from '../src/lib/board-mutations'
import {
  createWhiteboardDoc,
  type BoardElement,
  type ConnectorElement,
  type StickyElement,
  type TextElement,
} from '../src/types/whiteboard'

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

function label(id: string, text = 'hello'): TextElement {
  return {
    id,
    type: 'text',
    x: 0,
    y: 0,
    width: 240,
    height: 27,
    zIndex: 1,
    text,
    fontSize: 20,
    createdAt: 0,
    updatedAt: 0,
  }
}

function arrow(id: string, fromId: string, toId: string): ConnectorElement {
  return {
    id,
    type: 'connector',
    fromId,
    toId,
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

  it('still works on a board that has no connectors at all', () => {
    const doc = board()
    addElement(doc, label('t1'))
    addElement(doc, sticky('a'))

    removeElements(doc, ['t1'])

    expect(doc.elementsMap.has('t1')).toBe(false)
    expect(doc.elementOrder.toArray()).toEqual(['a'])
  })
})

// STU-862, closed here for every element type rather than special-cased for
// text: a connector whose endpoint is gone draws from nowhere to nowhere and
// cannot be selected, so it can never be cleaned up by hand.
describe('removeElements and the connectors pointing at what it deletes', () => {
  it('removes a connector that starts at the deleted element', () => {
    const doc = board()
    addElement(doc, sticky('a'))
    addElement(doc, sticky('b'))
    addElement(doc, arrow('c1', 'a', 'b'))

    removeElements(doc, ['a'])

    expect(doc.elementsMap.has('c1')).toBe(false)
    expect(doc.elementOrder.toArray()).toEqual(['b'])
  })

  it('removes a connector that ends at the deleted element', () => {
    const doc = board()
    addElement(doc, sticky('a'))
    addElement(doc, sticky('b'))
    addElement(doc, arrow('c1', 'a', 'b'))

    removeElements(doc, ['b'])

    expect(doc.elementsMap.has('c1')).toBe(false)
    expect(doc.elementOrder.toArray()).toEqual(['a'])
  })

  it('takes a text object’s connectors with it, like any other endpoint', () => {
    const doc = board()
    addElement(doc, label('t1'))
    addElement(doc, sticky('a'))
    addElement(doc, arrow('c1', 't1', 'a'))

    removeElements(doc, ['t1'])

    expect(doc.elementsMap.has('c1')).toBe(false)
    expect(doc.elementOrder.toArray()).toEqual(['a'])
  })

  it('leaves connectors between two surviving elements alone', () => {
    // The guard on the destructive half: an implementation that drops every
    // connector, or matches on the wrong field, passes the tests above and
    // fails this one.
    const doc = board()
    addElement(doc, sticky('a'))
    addElement(doc, sticky('b'))
    addElement(doc, sticky('c'))
    addElement(doc, arrow('keep', 'b', 'c'))
    addElement(doc, arrow('drop', 'a', 'b'))

    removeElements(doc, ['a'])

    expect(doc.elementsMap.get('keep')).toMatchObject({ fromId: 'b', toId: 'c' })
    expect(doc.elementsMap.has('drop')).toBe(false)
    expect(doc.elementOrder.toArray()).toEqual(['b', 'c', 'keep'])
  })

  it('takes every connector touching any element of a multi-element deletion', () => {
    const doc = board()
    addElement(doc, sticky('a'))
    addElement(doc, sticky('b'))
    addElement(doc, sticky('survivor'))
    addElement(doc, label('t1'))
    addElement(doc, arrow('from-a', 'a', 'survivor'))
    addElement(doc, arrow('to-b', 'survivor', 'b'))
    addElement(doc, arrow('keep', 'survivor', 't1'))

    removeElements(doc, ['a', 'b'])

    expect(doc.elementsMap.has('from-a')).toBe(false)
    expect(doc.elementsMap.has('to-b')).toBe(false)
    expect(doc.elementsMap.has('keep')).toBe(true)
    expect(doc.elementOrder.toArray()).toEqual(['survivor', 't1', 'keep'])
  })

  it('does not trip over a connector joining two elements both being deleted', () => {
    // The z-order is an array deleted by index, so a connector matched twice
    // is a chance to delete the wrong slot. Asserting the whole remaining
    // order, not just the absence of ids, is what catches that.
    const doc = board()
    addElement(doc, sticky('a'))
    addElement(doc, sticky('b'))
    addElement(doc, arrow('both', 'a', 'b'))
    addElement(doc, sticky('survivor'))

    removeElements(doc, ['a', 'b'])

    expect(doc.elementsMap.has('both')).toBe(false)
    expect(doc.elementsMap.size).toBe(1)
    expect(doc.elementOrder.toArray()).toEqual(['survivor'])
  })

  it('removes an element and its connectors in a single undoable step', () => {
    // captureTimeout 0 because Yjs's default 500ms window merges rapid
    // transactions into one stack item, which would let a second transact()
    // slip past `undoStack` having length 1. The UndoManager is created after
    // the setup so the only thing on its stack is the deletion itself.
    const doc = board()
    addElement(doc, sticky('a'))
    addElement(doc, sticky('b'))
    addElement(doc, arrow('c1', 'a', 'b'))
    const undoManager = new Y.UndoManager([doc.elementsMap, doc.elementOrder], {
      captureTimeout: 0,
    })

    removeElements(doc, ['a'])

    expect(doc.elementsMap.has('a')).toBe(false)
    expect(doc.elementsMap.has('c1')).toBe(false)
    expect(undoManager.undoStack).toHaveLength(1)

    undoManager.undo()

    expect(doc.elementsMap.has('a')).toBe(true)
    expect(doc.elementsMap.has('c1')).toBe(true)
    expect(doc.elementOrder.toArray()).toEqual(['a', 'b', 'c1'])
  })

  it('syncs the connector cleanup to a peer, not just the element', () => {
    const local = board()
    const remote = board()
    local.doc.on('update', (update) => Y.applyUpdate(remote.doc, update))

    addElement(local, sticky('a'))
    addElement(local, sticky('b'))
    addElement(local, arrow('c1', 'a', 'b'))
    removeElements(local, ['a'])

    expect(remote.elementsMap.has('c1')).toBe(false)
    expect(remote.elementOrder.toArray()).toEqual(['b'])
  })

  it('deletes a connector asked for by id without touching what it joined', () => {
    // The other guard: cleanup must follow connector -> element, never
    // element -> connector -> the far element.
    const doc = board()
    addElement(doc, sticky('a'))
    addElement(doc, sticky('b'))
    addElement(doc, arrow('c1', 'a', 'b'))

    removeElements(doc, ['c1'])

    expect(doc.elementsMap.has('c1')).toBe(false)
    expect(doc.elementOrder.toArray()).toEqual(['a', 'b'])
  })
})
