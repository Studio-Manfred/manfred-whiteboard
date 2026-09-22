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

/** The connection App is currently using, so tests can inspect the CRDT directly. */
let board: ReturnType<typeof makeBoard>

function makeBoard() {
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
}

vi.mock('../src/lib/yjs-provider', () => ({
  getRoomFromUrl: () => 'test-room',
  initWhiteboardConnection: () => {
    board = makeBoard()
    return board
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

  it('starts with nothing to undo or redo', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('enables undo once something is on the board', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)

    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('undoes and redoes from the buttons, not just the keyboard', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    expect(stickies()).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(stickies()).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(stickies()).toHaveLength(1)
  })

  it('keeps the buttons in step with the keyboard shortcuts', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)

    fireEvent.keyDown(window, { key: 'z', metaKey: true })

    expect(stickies()).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()
  })

  function openColours() {
    fireEvent.click(screen.getByRole('button', { name: 'Colours' }))
  }

  it('recolours the selected sticky note', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    fireEvent.pointerDown(stickies()[0], { clientX: 400, clientY: 300 })

    openColours()
    fireEvent.click(screen.getByRole('button', { name: 'Lavender' }))

    expect(stickies()[0]).toHaveStyle({ backgroundColor: '#E8D7FF' })
  })

  it('uses the picked colour for the next note when nothing is selected', () => {
    render(<App />)

    openColours()
    fireEvent.click(screen.getByRole('button', { name: 'Mint Frost' }))

    pickTool('Sticky note')
    clickCanvasAt(300, 300)

    expect(stickies()[0]).toHaveStyle({ backgroundColor: '#D4F0F0' })
  })

  it('offers a border control for a shape but not for a sticky note', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(300, 300)
    fireEvent.pointerDown(stickies()[0], { clientX: 300, clientY: 300 })
    openColours()
    expect(screen.queryByRole('group', { name: 'Border' })).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    pickTool('Rectangle')
    clickCanvasAt(700, 300)
    const shape = document.querySelector('[data-testid^="shape-"]') as HTMLElement
    fireEvent.pointerDown(shape, { clientX: 700, clientY: 300 })
    openColours()

    expect(screen.getByRole('group', { name: 'Border' })).toBeInTheDocument()
  })

  it('fills a selected shape', () => {
    render(<App />)

    pickTool('Rectangle')
    clickCanvasAt(500, 300)
    const shape = document.querySelector('[data-testid^="shape-"]') as HTMLElement
    fireEvent.pointerDown(shape, { clientX: 500, clientY: 300 })

    openColours()
    fireEvent.click(screen.getByRole('button', { name: 'Sky Blue' }))

    expect(document.querySelector('[data-testid^="shape-"] rect')).toHaveAttribute(
      'fill',
      '#CCE2FF'
    )
  })

  it('recolours in a single transaction, so it is one undo step', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    fireEvent.pointerDown(stickies()[0], { clientX: 400, clientY: 300 })

    // Counting transactions tests the batching this component controls, rather
    // than Y.UndoManager's capture window, which merges rapid changes anyway.
    let transactions = 0
    board.doc.on('afterTransaction', () => {
      transactions += 1
    })

    openColours()
    fireEvent.click(screen.getByRole('button', { name: 'Coral Pink' }))

    expect(stickies()[0]).toHaveStyle({ backgroundColor: '#FFD1DC' })
    expect(transactions).toBe(1)
  })

  function selected() {
    return Array.from(document.querySelectorAll('[data-testid^="sticky-"]')).filter((el) =>
      el.className.includes('ring-blue-500')
    )
  }

  function dragCanvas(from: { x: number; y: number }, to: { x: number; y: number }) {
    fireEvent.pointerDown(canvas(), { clientX: from.x, clientY: from.y })
    fireEvent.pointerMove(canvas(), { clientX: to.x, clientY: to.y })
    fireEvent.pointerUp(canvas(), { clientX: to.x, clientY: to.y })
  }

  function placeTwoNotes() {
    pickTool('Sticky note')
    clickCanvasAt(300, 300)
    pickTool('Sticky note')
    clickCanvasAt(700, 300)
  }

  it('selects everything a marquee sweeps', () => {
    render(<App />)
    placeTwoNotes()

    dragCanvas({ x: 120, y: 120 }, { x: 900, y: 500 })

    expect(selected()).toHaveLength(2)
  })

  it('selects only what the marquee actually touches', () => {
    render(<App />)
    placeTwoNotes()

    dragCanvas({ x: 120, y: 120 }, { x: 420, y: 500 })

    expect(selected()).toHaveLength(1)
  })

  it('shows the marquee while dragging and takes it away afterwards', () => {
    render(<App />)
    placeTwoNotes()

    fireEvent.pointerDown(canvas(), { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(canvas(), { clientX: 600, clientY: 400 })
    expect(screen.getByTestId('selection-marquee')).toBeInTheDocument()

    fireEvent.pointerUp(canvas(), { clientX: 600, clientY: 400 })
    expect(screen.queryByTestId('selection-marquee')).not.toBeInTheDocument()
  })

  it('clears the selection on a click with no drag', () => {
    render(<App />)
    placeTwoNotes()
    dragCanvas({ x: 120, y: 120 }, { x: 900, y: 500 })
    expect(selected()).toHaveLength(2)

    clickCanvasAt(50, 50)

    expect(selected()).toHaveLength(0)
  })

  it('adds to and removes from the selection with shift-click', () => {
    render(<App />)
    placeTwoNotes()
    const [first, second] = Array.from(stickies())

    fireEvent.pointerDown(first, { clientX: 300, clientY: 300 })
    expect(selected()).toHaveLength(1)

    fireEvent.pointerDown(second, { clientX: 700, clientY: 300, shiftKey: true })
    expect(selected()).toHaveLength(2)

    fireEvent.pointerDown(second, { clientX: 700, clientY: 300, shiftKey: true })
    expect(selected()).toHaveLength(1)
  })

  it('moves the whole selection when one of its members is dragged', () => {
    render(<App />)
    placeTwoNotes()
    dragCanvas({ x: 120, y: 120 }, { x: 900, y: 500 })
    const [first, second] = Array.from(stickies())
    const before = [first.style.left, second.style.left]

    fireEvent.pointerDown(first, { clientX: 300, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 350, clientY: 300 })
    fireEvent.pointerUp(canvas(), { clientX: 350, clientY: 300 })

    const after = Array.from(stickies()).map((el) => (el as HTMLElement).style.left)
    expect(parseFloat(after[0])).toBeCloseTo(parseFloat(before[0]) + 50)
    expect(parseFloat(after[1])).toBeCloseTo(parseFloat(before[1]) + 50)
  })

  it('moves a group in a single transaction', () => {
    render(<App />)
    placeTwoNotes()
    dragCanvas({ x: 120, y: 120 }, { x: 900, y: 500 })

    let transactions = 0
    board.doc.on('afterTransaction', () => {
      transactions += 1
    })

    fireEvent.pointerDown(stickies()[0], { clientX: 300, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 320, clientY: 300 })
    fireEvent.pointerUp(canvas(), { clientX: 320, clientY: 300 })

    expect(transactions).toBe(1)
  })

  it('deletes everything selected at once', () => {
    render(<App />)
    placeTwoNotes()
    dragCanvas({ x: 120, y: 120 }, { x: 900, y: 500 })

    fireEvent.keyDown(window, { key: 'Delete' })

    expect(stickies()).toHaveLength(0)
  })

  it('recolours a whole selection at once', () => {
    render(<App />)
    placeTwoNotes()
    dragCanvas({ x: 120, y: 120 }, { x: 900, y: 500 })

    fireEvent.click(screen.getByRole('button', { name: 'Colours' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lavender' }))

    Array.from(stickies()).forEach((el) =>
      expect(el).toHaveStyle({ backgroundColor: '#E8D7FF' })
    )
  })
})
