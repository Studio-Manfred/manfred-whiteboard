import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { boardFilename, downloadBlob, svgToPngBlob } from '../src/lib/download'

describe('boardFilename', () => {
  const when = new Date('2026-09-22T19:30:00Z')

  it('names the file after the board and the day', () => {
    expect(boardFilename('sprint-planning', 'png', when)).toBe(
      'manfred-whiteboard-sprint-planning-2026-09-22.png'
    )
  })

  it('tames a room name that is not filename-safe', () => {
    expect(boardFilename('Q3 planning / ideas!', 'json', when)).toBe(
      'manfred-whiteboard-q3-planning-ideas-2026-09-22.json'
    )
  })

  it('falls back when the room name has nothing usable in it', () => {
    expect(boardFilename('///', 'png', when)).toBe('manfred-whiteboard-board-2026-09-22.png')
  })
})

describe('downloadBlob', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let clicked: HTMLAnchorElement | null

  beforeEach(() => {
    clicked = null
    createObjectURL = vi.fn(() => 'blob:fake-url')
    revokeObjectURL = vi.fn()
    // jsdom implements neither.
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    // downloadBlob appends the anchor before clicking it, so it is findable here.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      clicked = document.querySelector('a[download]')
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hands the blob over under the given filename', () => {
    downloadBlob(new Blob(['hi'], { type: 'text/plain' }), 'board.json')

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clicked).not.toBeNull()
    expect(clicked!.download).toBe('board.json')
    expect(clicked!.href).toContain('blob:fake-url')
  })

  it('releases the object URL afterwards', () => {
    downloadBlob(new Blob(['hi']), 'board.json')

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
  })

  it('leaves no stray anchor in the document', () => {
    downloadBlob(new Blob(['hi']), 'board.json')

    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })
})

describe('svgToPngBlob', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'
  let context: { scale: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> }
  let canvas: HTMLCanvasElement | null

  function stubBrowser({
    imageFails = false,
    noContext = false,
    encodeFails = false,
  } = {}) {
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:svg-source'),
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })

    // jsdom has no image decoding and no canvas, so both are stubbed; what is
    // under test is the orchestration around them.
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => (imageFails ? this.onerror?.() : this.onload?.()))
      }
    }
    vi.stubGlobal('Image', FakeImage)

    context = { scale: vi.fn(), drawImage: vi.fn() }
    const createElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = createElement(tag)
      if (tag === 'canvas') canvas = el as HTMLCanvasElement
      return el
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        (noContext
          ? null
          : (context as unknown as CanvasRenderingContext2D)) as CanvasRenderingContext2D
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(encodeFails ? null : new Blob(['png'], { type: 'image/png' }))
    })
  }

  beforeEach(() => {
    canvas = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns a PNG blob', async () => {
    stubBrowser()

    const blob = await svgToPngBlob(svg, 100, 50)

    expect(blob.type).toBe('image/png')
  })

  it('renders at 2x so the export survives a good screen', async () => {
    stubBrowser()

    await svgToPngBlob(svg, 100, 50)

    expect(canvas!.width).toBe(200)
    expect(canvas!.height).toBe(100)
    expect(context.scale).toHaveBeenCalledWith(2, 2)
    expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 50)
  })

  it('releases the source URL even when rendering fails', async () => {
    stubBrowser({ imageFails: true })

    await expect(svgToPngBlob(svg, 10, 10)).rejects.toThrow(/could not render/i)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:svg-source')
  })

  it('fails loudly when the canvas gives no context', async () => {
    stubBrowser({ noContext: true })

    await expect(svgToPngBlob(svg, 10, 10)).rejects.toThrow(/could not render/i)
  })

  it('fails loudly when encoding produces nothing', async () => {
    stubBrowser({ encodeFails: true })

    await expect(svgToPngBlob(svg, 10, 10)).rejects.toThrow(/could not encode/i)
  })
})
