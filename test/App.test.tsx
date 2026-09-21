import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as Y from 'yjs'
import { createWhiteboardDoc } from '../src/types/whiteboard'

/**
 * Drives the real App against an in-memory Yjs document. Only the transport is
 * faked — the board document, the element layers and every handler are real,
 * so this covers the wiring that the extracted helpers deliberately leave out.
 */
const awarenessState = new Map<number, unknown>()

const fakeAwareness = {
  setLocalStateField: vi.fn(),
  getStates: () => awarenessState,
  on: vi.fn(),
  off: vi.fn(),
}

vi.mock('../src/lib/yjs-provider', () => ({
  getRoomFromUrl: () => 'test-room',
  initWhiteboardConnection: () => {
    const { doc, elementsMap, elementOrder } = createWhiteboardDoc(new Y.Doc())
    return {
      doc,
      elementsMap,
      elementOrder,
      undoManager: new Y.UndoManager([elementsMap, elementOrder]),
      wsProvider: null,
      indexeddbProvider: null,
      awareness: fakeAwareness,
      destroy: () => doc.destroy(),
    }
  },
}))

const { default: App } = await import('../src/App')

const CANVAS = /Interactive canvas workspace/

function canvas() {
  return screen.getByRole('region', { name: CANVAS })
}

function pickTool(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

function clickCanvasAt(x: number, y: number) {
  fireEvent.pointerDown(canvas(), { clientX: x, clientY: y })
  fireEvent.pointerUp(canvas(), { clientX: x, clientY: y })
}

function stickies() {
  return document.querySelectorAll('[data-testid^="sticky-"]')
}

describe('App', () => {
  beforeEach(() => {
    awarenessState.clear()
    vi.clearAllMocks()
  })

  it('renders the board chrome', () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('test-room')
    expect(screen.getByRole('toolbar', { name: 'Drawing tools' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Zoom controls' })).toBeInTheDocument()
    expect(canvas()).toBeInTheDocument()
  })

  it('creates a sticky note where the canvas was clicked', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)

    expect(stickies()).toHaveLength(1)
    expect(stickies()[0]).toHaveStyle({ left: '300px', top: '200px' })
  })

  it('returns to the select tool after placing an element', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(200, 200)

    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('selects tools by keyboard shortcut', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'r' })
    expect(screen.getByRole('button', { name: 'Rectangle' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    fireEvent.keyDown(window, { key: 'v' })
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('creates a shape with the rectangle tool', () => {
    render(<App />)

    pickTool('Rectangle')
    clickCanvasAt(300, 300)

    expect(document.querySelectorAll('[data-testid^="shape-"]')).toHaveLength(1)
  })

  it('deletes the selected element with the Delete key', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    expect(stickies()).toHaveLength(1)

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(stickies()).toHaveLength(0)
  })

  it('erases the element under the pointer with the eraser', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)

    pickTool('Eraser')
    clickCanvasAt(400, 300)

    expect(stickies()).toHaveLength(0)
  })

  it('leaves the board alone when the eraser hits empty canvas', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)

    pickTool('Eraser')
    clickCanvasAt(50, 50)

    expect(stickies()).toHaveLength(1)
  })

  it('commits a freehand stroke drawn with the pen', () => {
    render(<App />)

    pickTool('Pen')
    fireEvent.pointerDown(canvas(), { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(canvas(), { clientX: 120, clientY: 130 })
    fireEvent.pointerMove(canvas(), { clientX: 150, clientY: 110 })
    fireEvent.pointerMove(canvas(), { clientX: 180, clientY: 160 })
    fireEvent.pointerUp(canvas(), { clientX: 180, clientY: 160 })

    expect(document.querySelectorAll('[data-testid^="drawing-"]')).toHaveLength(1)
  })

  it('discards a pen tap that is too short to be a stroke', () => {
    render(<App />)

    pickTool('Pen')
    fireEvent.pointerDown(canvas(), { clientX: 100, clientY: 100 })
    fireEvent.pointerUp(canvas(), { clientX: 100, clientY: 100 })

    expect(document.querySelectorAll('[data-testid^="drawing-"]')).toHaveLength(0)
  })

  it('undoes and redoes the last change', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    expect(stickies()).toHaveLength(1)

    fireEvent.keyDown(window, { key: 'z', metaKey: true })
    expect(stickies()).toHaveLength(0)

    fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true })
    expect(stickies()).toHaveLength(1)
  })

  it('broadcasts the local cursor as it moves', () => {
    render(<App />)

    fireEvent.pointerMove(canvas(), { clientX: 250, clientY: 175 })

    expect(fakeAwareness.setLocalStateField).toHaveBeenCalledWith('cursor', {
      x: 250,
      y: 175,
    })
  })

  it('connects two elements with the connector tool', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(300, 300)
    pickTool('Sticky note')
    clickCanvasAt(800, 300)

    const [first, second] = Array.from(stickies())
    fireEvent.click(
      first.querySelector('[aria-label="Connect from right anchor"]') as Element
    )
    fireEvent.click(
      second.querySelector('[aria-label="Connect from left anchor"]') as Element
    )

    expect(document.querySelectorAll('[data-testid^="connector-"]')).toHaveLength(1)
  })

  it('ignores tool shortcuts typed into a note', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    fireEvent.doubleClick(stickies()[0])

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'r', bubbles: true })

    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('drags a note to a new position', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)

    const note = stickies()[0]
    fireEvent.pointerDown(note, { clientX: 400, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 450, clientY: 340 })
    fireEvent.pointerUp(canvas(), { clientX: 450, clientY: 340 })

    expect(stickies()[0]).toHaveStyle({ left: '350px', top: '240px' })
  })
})
