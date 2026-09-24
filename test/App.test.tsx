import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as Y from 'yjs'
import { createWhiteboardDoc } from '../src/types/whiteboard'
import { patternIdFor, patternLabel } from '../src/lib/fill-patterns'

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

vi.mock('../src/lib/download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/download')>()
  return {
    ...actual,
    // jsdom cannot rasterise; e2e/export.spec.ts covers the real thing.
    svgToPngBlob: vi.fn(async () => new Blob(['fake-png'], { type: 'image/png' })),
  }
})

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

  it('connects two elements from the keyboard, one anchor then another', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(300, 300)
    pickTool('Sticky note')
    clickCanvasAt(800, 300)

    const [first, second] = Array.from(stickies())
    // detail 0 is how a browser reports Enter or Space on a button
    fireEvent.click(first.querySelector('[aria-label="Connect from right anchor"]')!, {
      detail: 0,
    })
    fireEvent.click(second.querySelector('[aria-label="Connect from left anchor"]')!, {
      detail: 0,
    })

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

  function openBarControl(name: string) {
    fireEvent.click(screen.getByRole('button', { name }))
  }

  function selectNote(index = 0) {
    fireEvent.pointerDown(stickies()[index], { clientX: 400, clientY: 300 })
  }

  it('recolours the selected sticky note from the properties bar', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    selectNote()

    openBarControl('Fill colour')
    fireEvent.click(screen.getByRole('button', { name: 'Lavender' }))

    expect(stickies()[0]).toHaveStyle({ backgroundColor: '#E8D7FF' })
  })

  it('gives the next note the colour last applied', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    selectNote()
    openBarControl('Fill colour')
    fireEvent.click(screen.getByRole('button', { name: 'Mint Frost' }))

    pickTool('Sticky note')
    clickCanvasAt(700, 300)

    expect(stickies()[1]).toHaveStyle({ backgroundColor: '#D4F0F0' })
  })

  it('offers border controls for a shape but not for a sticky note', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(300, 300)
    fireEvent.pointerDown(stickies()[0], { clientX: 300, clientY: 300 })
    expect(screen.queryByRole('button', { name: 'Border colour' })).not.toBeInTheDocument()

    pickTool('Rectangle')
    clickCanvasAt(700, 300)
    const shape = document.querySelector('[data-testid^="shape-"]') as HTMLElement
    fireEvent.pointerDown(shape, { clientX: 700, clientY: 300 })

    expect(screen.getByRole('button', { name: 'Border colour' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thickness' })).toBeInTheDocument()
  })

  it('fills a selected shape', () => {
    render(<App />)

    pickTool('Rectangle')
    clickCanvasAt(500, 300)
    const shape = document.querySelector('[data-testid^="shape-"]') as HTMLElement
    fireEvent.pointerDown(shape, { clientX: 500, clientY: 300 })

    openBarControl('Fill colour')
    fireEvent.click(screen.getByRole('button', { name: 'Sky Blue' }))

    expect(document.querySelector('[data-testid^="shape-"] rect')).toHaveAttribute(
      'fill',
      '#CCE2FF'
    )
  })

  it('applies a fill pattern to a selected shape, from the fill panel', () => {
    // Wires PropertiesBar's onPatternChange the same way onFillChange etc.
    // are wired above — not covered by PropertiesBar's own tests, which stub
    // every handler out.
    render(<App />)

    pickTool('Rectangle')
    clickCanvasAt(500, 300)
    const shape = document.querySelector('[data-testid^="shape-"]') as HTMLElement
    fireEvent.pointerDown(shape, { clientX: 500, clientY: 300 })
    const shapeId = shape.getAttribute('data-testid')!.replace('shape-', '')

    openBarControl('Fill colour')
    fireEvent.click(screen.getByRole('button', { name: patternLabel('crosshatch') }))

    // A pattern also renders a `<rect>` of its own inside `<defs><pattern>` for
    // the tile background, ahead of the shape's own `<rect>` in document order
    // — `svg > rect` picks the shape's, not the tile's.
    expect(document.querySelector('[data-testid^="shape-"] svg > rect')).toHaveAttribute(
      'fill',
      `url(#${patternIdFor(shapeId)})`
    )
  })

  it('clears a shape back to a solid fill from the "No pattern" chip', () => {
    render(<App />)

    pickTool('Rectangle')
    clickCanvasAt(500, 300)
    const shape = document.querySelector('[data-testid^="shape-"]') as HTMLElement
    fireEvent.pointerDown(shape, { clientX: 500, clientY: 300 })
    const shapeRect = () => document.querySelector('[data-testid^="shape-"] svg > rect')!

    openBarControl('Fill colour')
    fireEvent.click(screen.getByRole('button', { name: patternLabel('crosshatch') }))
    expect(shapeRect()).toHaveAttribute('fill', expect.stringMatching(/^url\(#pattern-/))

    openBarControl('Fill colour')
    fireEvent.click(screen.getByRole('button', { name: 'No pattern' }))

    // A freshly drawn rectangle's fill defaults to transparent; clearing the
    // pattern falls back to whatever plain fill the shape already had.
    expect(shapeRect()).toHaveAttribute('fill', 'transparent')
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

    openBarControl('Fill colour')
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

    openBarControl('Fill colour')
    fireEvent.click(screen.getByRole('button', { name: 'Lavender' }))

    Array.from(stickies()).forEach((el) =>
      expect(el).toHaveStyle({ backgroundColor: '#E8D7FF' })
    )
  })

  /** jsdom's Blob implements neither text() nor arrayBuffer(). */
  function readBlob(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })
  }

  it('downloads a JSON backup of the board', async () => {
    const blobs: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', {
      value: (blob: Blob) => {
        blobs.push(blob)
        return 'blob:fake'
      },
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /JSON/ }))

    expect(blobs).toHaveLength(1)
    const backup = JSON.parse(await readBlob(blobs[0]))
    expect(backup.version).toBe(1)
    expect(backup.elements).toHaveLength(1)
    expect(backup.elements[0].type).toBe('sticky')

    click.mockRestore()
  })

  it('names the download after the room', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: () => 'blob:fake',
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true })
    let filename = ''
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      filename = document.querySelector('a[download]')?.getAttribute('download') ?? ''
    })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /JSON/ }))

    expect(filename).toMatch(/^manfred-whiteboard-test-room-\d{4}-\d{2}-\d{2}\.json$/)

    click.mockRestore()
  })

  it('downloads a PNG of the board', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: () => 'blob:fake',
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true })
    let filename = ''
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      filename = document.querySelector('a[download]')?.getAttribute('download') ?? ''
    })

    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /PNG/ }))
    await waitFor(() => expect(filename).toMatch(/\.png$/))

    click.mockRestore()
  })

  it('leaves the board alone when a PNG export fails', async () => {
    const { svgToPngBlob } = await import('../src/lib/download')
    vi.mocked(svgToPngBlob).mockRejectedValueOnce(new Error('no canvas here'))
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /PNG/ }))

    await waitFor(() => expect(errors).toHaveBeenCalled())
    expect(click).not.toHaveBeenCalled()
    expect(stickies()).toHaveLength(1)

    errors.mockRestore()
    click.mockRestore()
  })

  function selectFirstNote() {
    const note = stickies()[0] as HTMLElement
    fireEvent.pointerDown(note, { clientX: 400, clientY: 300 })
    return note
  }

  function handle(name: string) {
    return screen.getByRole('button', { name: `Resize from ${name}` })
  }

  it('shows resize handles only on a selected element', () => {
    render(<App />)

    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    // Creating selects it, so deselect first.
    clickCanvasAt(50, 50)
    expect(screen.queryByRole('button', { name: /^Resize from/ })).not.toBeInTheDocument()

    selectFirstNote()

    expect(screen.getAllByRole('button', { name: /^Resize from/ })).toHaveLength(8)
  })

  it('grows a note by dragging its right edge', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    const note = selectFirstNote()
    const before = parseFloat(note.style.width)

    fireEvent.pointerDown(handle('right edge'), { clientX: 500, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 560, clientY: 300 })
    fireEvent.pointerUp(canvas(), { clientX: 560, clientY: 300 })

    expect(parseFloat(stickies()[0].style.width)).toBeCloseTo(before + 60)
    expect(parseFloat(stickies()[0].style.height)).toBeCloseTo(200)
  })

  it('keeps the far edge pinned when dragging the left edge', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    const note = selectFirstNote()
    const rightEdge = parseFloat(note.style.left) + parseFloat(note.style.width)

    fireEvent.pointerDown(handle('left edge'), { clientX: 300, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 260, clientY: 300 })
    fireEvent.pointerUp(canvas(), { clientX: 260, clientY: 300 })

    const after = stickies()[0] as HTMLElement
    expect(parseFloat(after.style.left) + parseFloat(after.style.width)).toBeCloseTo(rightEdge)
    expect(parseFloat(after.style.width)).toBeCloseTo(240)
  })

  it('resizes both axes from a corner', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    selectFirstNote()

    fireEvent.pointerDown(handle('bottom right corner'), { clientX: 500, clientY: 400 })
    fireEvent.pointerMove(canvas(), { clientX: 550, clientY: 430 })
    fireEvent.pointerUp(canvas(), { clientX: 550, clientY: 430 })

    const after = stickies()[0] as HTMLElement
    expect(parseFloat(after.style.width)).toBeCloseTo(250)
    expect(parseFloat(after.style.height)).toBeCloseTo(230)
  })

  it('will not let an element be dragged inside out', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    selectFirstNote()

    fireEvent.pointerDown(handle('right edge'), { clientX: 500, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 100, clientY: 300 })
    fireEvent.pointerUp(canvas(), { clientX: 100, clientY: 300 })

    expect(parseFloat(stickies()[0].style.width)).toBe(40)
  })

  it('does not move the element when a handle is grabbed', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    const note = selectFirstNote()
    const left = note.style.left

    fireEvent.pointerDown(handle('right edge'), { clientX: 500, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 540, clientY: 340 })
    fireEvent.pointerUp(canvas(), { clientX: 540, clientY: 340 })

    expect((stickies()[0] as HTMLElement).style.left).toBe(left)
  })

  it('resizes from the keyboard', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    selectFirstNote()

    fireEvent.keyDown(handle('right edge'), { key: 'ArrowRight' })
    expect(parseFloat(stickies()[0].style.width)).toBeCloseTo(210)

    fireEvent.keyDown(handle('right edge'), { key: 'ArrowRight', shiftKey: true })
    expect(parseFloat(stickies()[0].style.width)).toBeCloseTo(250)
  })

  it('resizes a shape too', () => {
    render(<App />)
    pickTool('Rectangle')
    clickCanvasAt(400, 300)
    const shape = document.querySelector('[data-testid^="shape-"]') as HTMLElement
    fireEvent.pointerDown(shape, { clientX: 400, clientY: 300 })

    fireEvent.keyDown(handle('bottom edge'), { key: 'ArrowDown' })

    const after = document.querySelector('[data-testid^="shape-"]') as HTMLElement
    expect(parseFloat(after.style.height)).toBeCloseTo(110)
  })

  it('resizes in board units, whatever the zoom', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    selectFirstNote()

    // Zoom to 200%: an on-screen drag of 100px is 50 board units.
    fireEvent.click(screen.getByRole('button', { name: 'Zoom In' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom In' }))

    const width = parseFloat(stickies()[0].style.width)
    expect(width).toBeCloseTo(200)
  })

  function twoNotes() {
    pickTool('Sticky note')
    clickCanvasAt(300, 300)
    pickTool('Sticky note')
    clickCanvasAt(800, 300)
    return Array.from(stickies()) as HTMLElement[]
  }

  function anchorOf(note: HTMLElement, side: string) {
    return note.querySelector(`[aria-label="Connect from ${side} anchor"]`) as Element
  }

  function connectors() {
    return document.querySelectorAll('[data-testid^="connector-"]')
  }

  it('previews an arrow while it is being dragged out of an anchor', () => {
    render(<App />)
    const [first] = twoNotes()

    fireEvent.pointerDown(anchorOf(first, 'right'), { clientX: 400, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 520, clientY: 320 })

    expect(screen.getByTestId('draft-arrow')).toBeInTheDocument()
    expect(connectors()).toHaveLength(0)
  })

  it('shows every element its anchors while an arrow is in flight', () => {
    render(<App />)
    const [first, second] = twoNotes()

    expect(anchorOf(second, 'left').className).toContain('opacity-0')

    fireEvent.pointerDown(anchorOf(first, 'right'), { clientX: 400, clientY: 300 })

    expect(anchorOf(second, 'left').className).toContain('opacity-100')
  })

  it('snaps to a nearby anchor and marks it', () => {
    render(<App />)
    const [first, second] = twoNotes()

    fireEvent.pointerDown(anchorOf(first, 'right'), { clientX: 400, clientY: 300 })
    // Second note spans x 700-900; its left anchor is at (700, 300).
    fireEvent.pointerMove(canvas(), { clientX: 680, clientY: 300 })

    expect(anchorOf(second, 'left')).toHaveAttribute('data-snap-target', 'true')
    expect(screen.getByTestId('draft-arrow').getAttribute('stroke')).toBe('#3b82f6')
  })

  it('creates the arrow when the drag is released on a snap', () => {
    render(<App />)
    const [first] = twoNotes()

    fireEvent.pointerDown(anchorOf(first, 'right'), { clientX: 400, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 680, clientY: 300 })
    fireEvent.pointerUp(canvas(), { clientX: 680, clientY: 300 })

    expect(connectors()).toHaveLength(1)
    expect(screen.queryByTestId('draft-arrow')).not.toBeInTheDocument()
  })

  it('lands on an element dropped anywhere over its body', () => {
    render(<App />)
    const [first] = twoNotes()

    fireEvent.pointerDown(anchorOf(first, 'right'), { clientX: 400, clientY: 300 })
    // Deep inside the second note, nowhere near a dot.
    fireEvent.pointerMove(canvas(), { clientX: 800, clientY: 300 })
    fireEvent.pointerUp(canvas(), { clientX: 800, clientY: 300 })

    expect(connectors()).toHaveLength(1)
  })

  it('creates nothing when the arrow is dropped on empty canvas', () => {
    render(<App />)
    const [first] = twoNotes()

    fireEvent.pointerDown(anchorOf(first, 'right'), { clientX: 400, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 520, clientY: 700 })
    fireEvent.pointerUp(canvas(), { clientX: 520, clientY: 700 })

    expect(connectors()).toHaveLength(0)
    expect(screen.queryByTestId('draft-arrow')).not.toBeInTheDocument()
  })

  it('will not let an element connect to itself', () => {
    render(<App />)
    const [first] = twoNotes()

    fireEvent.pointerDown(anchorOf(first, 'right'), { clientX: 400, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 300, clientY: 400 })
    fireEvent.pointerUp(canvas(), { clientX: 300, clientY: 400 })

    expect(connectors()).toHaveLength(0)
  })

  it('abandons the arrow on Escape', () => {
    render(<App />)
    const [first] = twoNotes()

    fireEvent.pointerDown(anchorOf(first, 'right'), { clientX: 400, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 680, clientY: 300 })
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByTestId('draft-arrow')).not.toBeInTheDocument()

    fireEvent.pointerUp(canvas(), { clientX: 680, clientY: 300 })
    expect(connectors()).toHaveLength(0)
  })

  it('does not drag the note itself when starting from its anchor', () => {
    render(<App />)
    const [first] = twoNotes()
    const before = first.style.left

    fireEvent.pointerDown(anchorOf(first, 'right'), { clientX: 400, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 520, clientY: 360 })
    fireEvent.pointerUp(canvas(), { clientX: 520, clientY: 360 })

    expect((stickies()[0] as HTMLElement).style.left).toBe(before)
  })

  function bar() {
    return screen.queryByRole('toolbar', { name: 'Selection properties' })
  }

  it('shows the properties bar only while something is selected', () => {
    render(<App />)
    expect(bar()).not.toBeInTheDocument()

    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    expect(bar()).toBeInTheDocument()

    clickCanvasAt(50, 50)
    expect(bar()).not.toBeInTheDocument()
  })

  it('keeps the bar out of the way while a marquee is being dragged', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    clickCanvasAt(50, 50)

    fireEvent.pointerDown(canvas(), { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(canvas(), { clientX: 700, clientY: 600 })
    expect(bar()).not.toBeInTheDocument()

    fireEvent.pointerUp(canvas(), { clientX: 700, clientY: 600 })
    expect(bar()).toBeInTheDocument()
  })

  it('changes a shape border thickness', () => {
    render(<App />)
    pickTool('Rectangle')
    clickCanvasAt(400, 300)
    const shape = () => document.querySelector('[data-testid^="shape-"] rect') as SVGRectElement
    expect(shape().getAttribute('stroke-width')).toBe('2')

    fireEvent.pointerDown(
      document.querySelector('[data-testid^="shape-"]') as HTMLElement,
      { clientX: 400, clientY: 300 }
    )
    openBarControl('Thickness')
    fireEvent.click(screen.getByRole('button', { name: '8 px' }))

    expect(shape().getAttribute('stroke-width')).toBe('8')
  })

  it('changes a note text size and font', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    selectNote()

    openBarControl('Text size')
    fireEvent.click(screen.getByRole('button', { name: '24 px' }))
    openBarControl('Font')
    fireEvent.click(screen.getByRole('button', { name: 'Mono' }))

    const text = stickies()[0].querySelector('div > div') as HTMLElement
    expect(text.style.fontSize).toBe('24px')
    expect(text.style.fontFamily).toMatch(/monospace/)
  })

  it('changes the arrowheads on a selected arrow', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(300, 300)
    pickTool('Sticky note')
    clickCanvasAt(800, 300)

    const [first, second] = Array.from(stickies()) as HTMLElement[]
    fireEvent.click(first.querySelector('[aria-label="Connect from right anchor"]')!, {
      detail: 0,
    })
    fireEvent.click(second.querySelector('[aria-label="Connect from left anchor"]')!, {
      detail: 0,
    })

    const paths = () =>
      document.querySelector('[data-testid^="connector-"]')!.querySelectorAll('path')
    // [0] is the invisible fat hit area that carries the click handler.
    fireEvent.click(paths()[0])
    const arrowPath = () => paths()[1]

    openBarControl('Arrowheads')
    fireEvent.click(screen.getByRole('button', { name: 'Arrowheads at both ends' }))

    expect(arrowPath().getAttribute('marker-start')).toContain('arrowhead-start')
    expect(arrowPath().getAttribute('marker-end')).toContain('arrowhead')
  })

  it('styles a whole selection in one undo step', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(300, 300)
    pickTool('Sticky note')
    clickCanvasAt(800, 300)

    // marquee over both
    fireEvent.pointerDown(canvas(), { clientX: 120, clientY: 120 })
    fireEvent.pointerMove(canvas(), { clientX: 1000, clientY: 500 })
    fireEvent.pointerUp(canvas(), { clientX: 1000, clientY: 500 })

    let transactions = 0
    board.doc.on('afterTransaction', () => {
      transactions += 1
    })

    openBarControl('Text size')
    fireEvent.click(screen.getByRole('button', { name: '32 px' }))

    expect(transactions).toBe(1)
    Array.from(stickies()).forEach((note) => {
      const text = note.querySelector('div > div') as HTMLElement
      expect(text.style.fontSize).toBe('32px')
    })
  })

  it('has no palette left in the main toolbar', () => {
    render(<App />)

    expect(screen.queryByRole('button', { name: 'Colours' })).not.toBeInTheDocument()
  })

  /** Ids of the notes and shapes in paint order, back to front. */
  function paintOrder() {
    return Array.from(
      document.querySelectorAll('[data-testid^="sticky-"], [data-testid^="shape-"]')
    ).map((el) => el.getAttribute('data-testid'))
  }

  function stack(command: string) {
    openBarControl('Stack order')
    fireEvent.click(screen.getByRole('button', { name: command }))
  }

  it('paints later elements on top by default', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    pickTool('Sticky note')
    clickCanvasAt(440, 330)

    const [first, second] = paintOrder()
    expect(first).not.toBe(second)
    expect(paintOrder()).toHaveLength(2)
  })

  it('sends the selection to the back and brings it forward again', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    pickTool('Sticky note')
    clickCanvasAt(440, 330)

    const top = paintOrder()[1]
    // The newest note is selected right after creating it.
    stack('Send to back')
    expect(paintOrder()[0]).toBe(top)

    stack('Bring to front')
    expect(paintOrder()[1]).toBe(top)
  })

  it('steps one place at a time', () => {
    render(<App />)
    for (const x of [300, 340, 380]) {
      pickTool('Sticky note')
      clickCanvasAt(x, 300)
    }
    const newest = paintOrder()[2]

    stack('Send backward')
    expect(paintOrder()[1]).toBe(newest)

    stack('Send backward')
    expect(paintOrder()[0]).toBe(newest)
  })

  it('stacks a shape above a note, which used to be impossible', () => {
    render(<App />)
    pickTool('Rectangle')
    clickCanvasAt(400, 300)
    pickTool('Sticky note')
    clickCanvasAt(430, 330)

    // The note is on top, having been made last; put the shape above it.
    const shapeId = paintOrder().find((id) => id!.startsWith('shape-'))
    fireEvent.pointerDown(
      document.querySelector('[data-testid^="shape-"]') as HTMLElement,
      { clientX: 400, clientY: 300 }
    )
    stack('Bring to front')

    expect(paintOrder()[1]).toBe(shapeId)
  })

  it('restacks in one undo step', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    pickTool('Sticky note')
    clickCanvasAt(440, 330)

    let transactions = 0
    board.doc.on('afterTransaction', () => {
      transactions += 1
    })

    stack('Send to back')

    expect(transactions).toBe(1)
  })

  it('writes nothing when the command changes nothing', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    pickTool('Sticky note')
    clickCanvasAt(440, 330)

    let transactions = 0
    board.doc.on('afterTransaction', () => {
      transactions += 1
    })

    // The newest is already at the front.
    stack('Bring to front')

    expect(transactions).toBe(0)
  })

  it('aligns a note text and its editor', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    selectNote()

    openBarControl('Text alignment')
    fireEvent.click(screen.getByRole('button', { name: 'Align right' }))

    const text = stickies()[0].querySelector('div > div') as HTMLElement
    expect(text.style.textAlign).toBe('right')

    // The editor has to follow, not just the rendered text.
    fireEvent.doubleClick(stickies()[0])
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).style.textAlign).toBe('right')
  })

  it('leaves a note left-aligned until asked otherwise', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)

    const text = stickies()[0].querySelector('div > div') as HTMLElement
    expect(text.style.textAlign).toBe('left')
  })

  it('aligns a whole selection in one undo step', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(300, 300)
    pickTool('Sticky note')
    clickCanvasAt(800, 300)

    fireEvent.pointerDown(canvas(), { clientX: 120, clientY: 120 })
    fireEvent.pointerMove(canvas(), { clientX: 1000, clientY: 500 })
    fireEvent.pointerUp(canvas(), { clientX: 1000, clientY: 500 })

    let transactions = 0
    board.doc.on('afterTransaction', () => {
      transactions += 1
    })

    openBarControl('Text alignment')
    fireEvent.click(screen.getByRole('button', { name: 'Align centre' }))

    expect(transactions).toBe(1)
    Array.from(stickies()).forEach((note) => {
      const text = note.querySelector('div > div') as HTMLElement
      expect(text.style.textAlign).toBe('center')
    })
  })

  it('lifts a note while it is being dragged, and sets it down afterwards', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(400, 300)
    const note = () => stickies()[0] as HTMLElement

    fireEvent.pointerDown(note(), { clientX: 400, clientY: 300 })
    expect(note().className).not.toContain('shadow-2xl')

    fireEvent.pointerMove(canvas(), { clientX: 450, clientY: 340 })
    expect(note().className).toContain('shadow-2xl')

    fireEvent.pointerUp(canvas(), { clientX: 450, clientY: 340 })
    expect(note().className).not.toContain('shadow-2xl')
  })

  it('lifts every member of a dragged selection', () => {
    render(<App />)
    pickTool('Sticky note')
    clickCanvasAt(300, 300)
    pickTool('Sticky note')
    clickCanvasAt(800, 300)

    fireEvent.pointerDown(canvas(), { clientX: 120, clientY: 120 })
    fireEvent.pointerMove(canvas(), { clientX: 1000, clientY: 500 })
    fireEvent.pointerUp(canvas(), { clientX: 1000, clientY: 500 })

    fireEvent.pointerDown(stickies()[0], { clientX: 300, clientY: 300 })
    fireEvent.pointerMove(canvas(), { clientX: 320, clientY: 300 })

    Array.from(stickies()).forEach((note) =>
      expect(note.className).toContain('shadow-2xl')
    )
  })

  function drawStroke(fromX: number, toX: number, y: number) {
    pickTool('Pen')
    fireEvent.pointerDown(canvas(), { clientX: fromX, clientY: y })
    fireEvent.pointerMove(canvas(), { clientX: (fromX + toX) / 2, clientY: y + 30 })
    fireEvent.pointerMove(canvas(), { clientX: toX, clientY: y })
    fireEvent.pointerUp(canvas(), { clientX: toX, clientY: y })
    pickTool('Select')
  }

  function ink() {
    return document.querySelectorAll('[data-testid^="drawing-"]')
  }

  it('selects a stroke and offers it resize handles', () => {
    render(<App />)
    drawStroke(200, 400, 300)

    const hitArea = ink()[0].querySelectorAll('path')[0]
    fireEvent.pointerDown(hitArea, { clientX: 300, clientY: 315 })

    expect(screen.getAllByRole('button', { name: /^Resize from/ })).toHaveLength(8)
  })

  it('scales a stroke when it is resized', () => {
    render(<App />)
    drawStroke(200, 400, 300)
    fireEvent.pointerDown(ink()[0].querySelectorAll('path')[0], { clientX: 300, clientY: 315 })

    const pathBefore = ink()[0].querySelector('path')!.getAttribute('d')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Resize from right edge' }), {
      key: 'ArrowRight',
      shiftKey: true,
    })

    // The stroke itself is redrawn, not just its box.
    expect(ink()[0].querySelector('path')!.getAttribute('d')).not.toBe(pathBefore)
  })

  it('offers a stroke the stack controls', () => {
    render(<App />)
    drawStroke(200, 400, 300)
    fireEvent.pointerDown(ink()[0].querySelectorAll('path')[0], { clientX: 300, clientY: 315 })

    expect(screen.getByRole('button', { name: 'Stack order' })).toBeInTheDocument()
  })

  it('stacks a stroke among notes and shapes', () => {
    render(<App />)
    drawStroke(200, 400, 300)
    pickTool('Sticky note')
    clickCanvasAt(300, 320)

    const order = () =>
      Array.from(
        document.querySelectorAll(
          '[data-testid^="sticky-"], [data-testid^="shape-"], [data-testid^="drawing-"]'
        )
      ).map((el) => el.getAttribute('data-testid'))

    // The note was made last, so it is on top of the stroke.
    const strokeId = order().find((id) => id!.startsWith('drawing-'))
    expect(order()[1]).not.toBe(strokeId)

    fireEvent.pointerDown(ink()[0].querySelectorAll('path')[0], { clientX: 300, clientY: 315 })
    openBarControl('Stack order')
    fireEvent.click(screen.getByRole('button', { name: 'Bring to front' }))

    expect(order()[1]).toBe(strokeId)
  })

  it('recolours a stroke', () => {
    render(<App />)
    drawStroke(200, 400, 300)
    fireEvent.pointerDown(ink()[0].querySelectorAll('path')[0], { clientX: 300, clientY: 315 })

    openBarControl('Line colour')
    fireEvent.click(screen.getByRole('button', { name: 'Red' }))
    // Deselect, since a selected stroke is drawn in the selection colour.
    clickCanvasAt(50, 50)

    expect(ink()[0].querySelector('[data-ink="pen"]')!.getAttribute('fill')).toBe('#dc2626')
  })

  it('moves a stroke, ink and all', () => {
    render(<App />)
    drawStroke(200, 400, 300)
    const hitArea = () => ink()[0].querySelectorAll('path')[0]
    fireEvent.pointerDown(hitArea(), { clientX: 300, clientY: 315 })

    const item = () => ink()[0] as HTMLElement
    const inkPath = () => ink()[0].querySelector('[data-ink="pen"]')!.getAttribute('d')
    const left = parseFloat(item().style.left)
    const pathBefore = inkPath()

    fireEvent.pointerDown(hitArea(), { clientX: 300, clientY: 315 })
    fireEvent.pointerMove(canvas(), { clientX: 400, clientY: 315 })
    fireEvent.pointerUp(canvas(), { clientX: 400, clientY: 315 })

    // The box moves...
    expect(parseFloat(item().style.left)).toBeCloseTo(left + 100)
    // ...and so does the ink. Moving the box alone would cancel against the
    // svg viewBox and leave the stroke exactly where it was.
    expect(inkPath()).not.toBe(pathBefore)
  })

  it('moves a stroke along with a selection it belongs to', () => {
    render(<App />)
    drawStroke(200, 400, 300)
    pickTool('Sticky note')
    clickCanvasAt(600, 500)

    // marquee over both
    fireEvent.pointerDown(canvas(), { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(canvas(), { clientX: 900, clientY: 700 })
    fireEvent.pointerUp(canvas(), { clientX: 900, clientY: 700 })

    const inkPath = () => ink()[0].querySelector('[data-ink="pen"]')!.getAttribute('d')
    const noteLeft = () => parseFloat((stickies()[0] as HTMLElement).style.left)
    const pathBefore = inkPath()
    const before = noteLeft()

    fireEvent.pointerDown(stickies()[0], { clientX: 600, clientY: 500 })
    fireEvent.pointerMove(canvas(), { clientX: 650, clientY: 500 })
    fireEvent.pointerUp(canvas(), { clientX: 650, clientY: 500 })

    expect(noteLeft()).toBeCloseTo(before + 50)
    expect(inkPath()).not.toBe(pathBefore)
  })
})
