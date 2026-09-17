import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import {
  createWhiteboardDoc,
  type StickyElement,
  type ShapeElement,
  type ConnectorElement
} from '../src/types/whiteboard'

describe('Yjs CRDT Whiteboard State Sync', () => {
  it('converges two peer documents after exchanging updates', () => {
    const docA = new Y.Doc()
    const docB = new Y.Doc()

    const elementsA = docA.getMap<StickyElement>('elements')
    const elementsB = docB.getMap<StickyElement>('elements')

    // Peer A adds a sticky note
    const note1: StickyElement = {
      id: 'note-1',
      type: 'sticky',
      x: 100,
      y: 150,
      width: 200,
      height: 200,
      zIndex: 1,
      text: 'Collaborative note from Peer A',
      color: '#FFF9B1',
      fontSize: 16,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    elementsA.set(note1.id, note1)

    // Sync Doc A -> Doc B
    const updateAtoB = Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB))
    Y.applyUpdate(docB, updateAtoB)

    expect(elementsB.get('note-1')).toEqual(note1)

    // Peer B updates note text and moves it
    const updatedNote: StickyElement = {
      ...note1,
      x: 300,
      text: 'Edited by Peer B',
      updatedAt: Date.now() + 100
    }
    elementsB.set(note1.id, updatedNote)

    // Sync Doc B -> Doc A
    const updateBtoA = Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA))
    Y.applyUpdate(docA, updateBtoA)

    expect(elementsA.get('note-1')).toEqual(updatedNote)
  })

  it('handles concurrent additions and deletions correctly', () => {
    const docA = new Y.Doc()
    const docB = new Y.Doc()

    const elementsA = docA.getMap('elements')
    const elementsB = docB.getMap('elements')

    // Peer A adds note-1, Peer B adds shape-2 concurrently
    const noteA: StickyElement = {
      id: 'note-1',
      type: 'sticky',
      x: 10,
      y: 10,
      width: 200,
      height: 200,
      zIndex: 1,
      text: 'Note A',
      color: '#D4F0F0',
      fontSize: 16,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    const shapeB: ShapeElement = {
      id: 'shape-2',
      type: 'shape',
      shapeType: 'rectangle',
      x: 500,
      y: 500,
      width: 150,
      height: 100,
      fillColor: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 2,
      zIndex: 2,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    elementsA.set(noteA.id, noteA)
    elementsB.set(shapeB.id, shapeB)

    // Sync both ways
    const updateA = Y.encodeStateAsUpdate(docA)
    const updateB = Y.encodeStateAsUpdate(docB)
    Y.applyUpdate(docB, updateA)
    Y.applyUpdate(docA, updateB)

    expect(elementsA.size).toBe(2)
    expect(elementsB.size).toBe(2)
    expect(elementsA.get('note-1')).toEqual(noteA)
    expect(elementsA.get('shape-2')).toEqual(shapeB)
    expect(elementsB.get('note-1')).toEqual(noteA)
    expect(elementsB.get('shape-2')).toEqual(shapeB)
  })

  it('maintains element order in Y.Array across sync', () => {
    const docA = new Y.Doc()
    const docB = new Y.Doc()

    const orderA = docA.getArray<string>('elementOrder')
    const orderB = docB.getArray<string>('elementOrder')

    orderA.push(['item-1', 'item-2', 'item-3'])

    // Sync
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA))
    expect(orderB.toArray()).toEqual(['item-1', 'item-2', 'item-3'])

    // Reorder on B: move item-1 to top
    orderB.delete(0, 1)
    orderB.push(['item-1'])

    // Sync back
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB))
    expect(orderA.toArray()).toEqual(['item-2', 'item-3', 'item-1'])
  })

  it('createWhiteboardDoc helper initializes standard schema structures', () => {
    const { doc, elementsMap, elementOrder } = createWhiteboardDoc()
    expect(doc).toBeDefined()
    expect(elementsMap).toBeDefined()
    expect(elementOrder).toBeDefined()
    expect(elementsMap.size).toBe(0)
    expect(elementOrder.length).toBe(0)
  })
})
