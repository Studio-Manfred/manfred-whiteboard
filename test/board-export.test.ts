import { describe, it, expect } from 'vitest'
import { boardBounds, boardToSvg, boardToJson, EXPORT_PADDING } from '../src/lib/board-export'
import type {
  BoardElement,
  ConnectorElement,
  DrawingElement,
  ShapeElement,
  StickyElement,
} from '../src/types/whiteboard'

function sticky(id: string, x = 0, y = 0, text = ''): StickyElement {
  return {
    id,
    type: 'sticky',
    x,
    y,
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

function shape(id: string, shapeType: ShapeElement['shapeType'] = 'rectangle'): ShapeElement {
  return {
    id,
    type: 'shape',
    shapeType,
    x: 300,
    y: 0,
    width: 120,
    height: 100,
    zIndex: 2,
    fillColor: '#CCE2FF',
    strokeColor: '#0f172a',
    strokeWidth: 2,
    createdAt: 0,
    updatedAt: 0,
  }
}

function drawing(id: string): DrawingElement {
  return {
    id,
    type: 'drawing',
    x: 0,
    y: 300,
    width: 50,
    height: 50,
    zIndex: 3,
    points: [
      { x: 0, y: 300 },
      { x: 25, y: 340 },
      { x: 50, y: 310 },
    ],
    strokeColor: '#ef4444',
    strokeWidth: 3,
    createdAt: 0,
    updatedAt: 0,
  }
}

function connector(id: string, fromId: string, toId: string): ConnectorElement {
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
    zIndex: 4,
    strokeColor: '#475569',
    strokeWidth: 2,
    style: 'curved',
    createdAt: 0,
    updatedAt: 0,
  }
}

function board(...elements: BoardElement[]) {
  return new Map(elements.map((el) => [el.id, el]))
}

describe('boardBounds', () => {
  it('wraps every element with padding', () => {
    const bounds = boardBounds(board(sticky('a', 0, 0), shape('b')))

    expect(bounds).toEqual({
      x: -EXPORT_PADDING,
      y: -EXPORT_PADDING,
      width: 420 + EXPORT_PADDING * 2,
      height: 200 + EXPORT_PADDING * 2,
    })
  })

  it('handles negative coordinates', () => {
    const bounds = boardBounds(board(sticky('a', -500, -300)))

    expect(bounds.x).toBe(-500 - EXPORT_PADDING)
    expect(bounds.y).toBe(-300 - EXPORT_PADDING)
  })

  it('ignores connectors, which have no geometry of their own', () => {
    const bounds = boardBounds(board(sticky('a', 100, 100), connector('c', 'a', 'a')))

    expect(bounds.x).toBe(100 - EXPORT_PADDING)
    expect(bounds.y).toBe(100 - EXPORT_PADDING)
  })

  it('gives an empty board a non-zero canvas', () => {
    const bounds = boardBounds(board())

    expect(bounds.width).toBeGreaterThan(0)
    expect(bounds.height).toBeGreaterThan(0)
  })
})

describe('boardToSvg', () => {
  it('produces a standalone svg sized to the board', () => {
    const svg = boardToSvg(board(sticky('a')))

    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('viewBox=')
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
  })

  it('draws a sticky note as a filled rect carrying its text', () => {
    const svg = boardToSvg(board(sticky('a', 0, 0, 'Hello board')))

    expect(svg).toContain('#FFF9B1')
    expect(svg).toContain('Hello board')
  })

  it('escapes text so a stray angle bracket cannot break the file', () => {
    const svg = boardToSvg(board(sticky('a', 0, 0, 'a < b & c > d')))

    expect(svg).toContain('&lt;')
    expect(svg).toContain('&amp;')
    expect(svg).not.toContain('a < b')
  })

  it('wraps long text onto several lines', () => {
    const long = 'word '.repeat(40).trim()
    const svg = boardToSvg(board(sticky('a', 0, 0, long)))

    expect((svg.match(/<tspan/g) ?? []).length).toBeGreaterThan(1)
  })

  it('keeps the author’s line breaks', () => {
    const svg = boardToSvg(board(sticky('a', 0, 0, 'one\ntwo')))

    expect(svg).toContain('one')
    expect(svg).toContain('two')
    expect((svg.match(/<tspan/g) ?? []).length).toBe(2)
  })

  it('draws a rectangle and a circle differently', () => {
    expect(boardToSvg(board(shape('r', 'rectangle')))).toContain('<rect')
    expect(boardToSvg(board(shape('c', 'circle')))).toContain('<ellipse')
  })

  it('draws ink as a path in its own colour', () => {
    const svg = boardToSvg(board(drawing('d')))

    expect(svg).toContain('<path')
    expect(svg).toContain('#ef4444')
  })

  it('exports pen ink as a filled outline, as the canvas draws it', () => {
    const svg = boardToSvg(board({ ...drawing('d'), ink: 'pen' }))

    expect(svg).toContain('fill="#ef4444"')
    expect(svg).not.toContain('stroke="#ef4444"')
  })

  it('exports an older uniform stroke unchanged', () => {
    const svg = boardToSvg(board(drawing('d')))

    expect(svg).toContain('stroke="#ef4444"')
    expect(svg).toContain('stroke-width="3"')
  })

  it('draws a connector between its endpoints', () => {
    const svg = boardToSvg(board(sticky('a', 0, 0), sticky('b', 400, 0), connector('c', 'a', 'b')))

    expect(svg).toContain('#475569')
    expect(svg).toContain('C ')
  })

  it('gives connectors the arrowhead the board shows', () => {
    const svg = boardToSvg(board(sticky('a', 0, 0), sticky('b', 400, 0), connector('c', 'a', 'b')))

    expect(svg).toContain('<marker')
    expect(svg).toContain('marker-end="url(#arrowhead)"')
  })

  it('leaves out the marker definition when there is nothing to point', () => {
    const svg = boardToSvg(board(sticky('a', 0, 0)))

    expect(svg).not.toContain('<marker')
  })

  it('exports the arrowheads an arrow actually has', () => {
    const both = boardToSvg(
      board(sticky('a', 0, 0), sticky('b', 400, 0), {
        ...connector('c', 'a', 'b'),
        startArrow: true,
        endArrow: true,
      })
    )
    expect(both).toContain('marker-start="url(#arrowhead-start)"')
    expect(both).toContain('marker-end="url(#arrowhead)"')

    const plain = boardToSvg(
      board(sticky('a', 0, 0), sticky('b', 400, 0), {
        ...connector('c', 'a', 'b'),
        startArrow: false,
        endArrow: false,
      })
    )
    expect(plain).not.toContain('marker-start')
    expect(plain).not.toContain('marker-end')
  })

  it('exports a note in its chosen font', () => {
    const svg = boardToSvg(
      board({ ...sticky('a', 0, 0, 'Styled'), fontSize: 24, fontFamily: 'mono' })
    )

    expect(svg).toContain('font-size="24"')
    expect(svg).toMatch(/font-family="[^"]*monospace"/)
  })

  it('exports a note left-aligned by default, as it has always looked', () => {
    const svg = boardToSvg(board(sticky('a', 0, 0, 'Hello')))

    expect(svg).toContain('text-anchor="start"')
    expect(svg).toContain('<tspan x="16"')
  })

  it('moves both the anchor and the x when text is aligned', () => {
    const centred = boardToSvg(
      board({ ...sticky('a', 0, 0, 'Hello'), textAlign: 'center' })
    )
    expect(centred).toContain('text-anchor="middle"')
    expect(centred).toContain('<tspan x="100"')

    const right = boardToSvg(board({ ...sticky('a', 0, 0, 'Hello'), textAlign: 'right' }))
    expect(right).toContain('text-anchor="end"')
    expect(right).toContain('<tspan x="184"')
  })

  it("exports a shape's label, centred by default", () => {
    const svg = boardToSvg(board({ ...shape('s'), text: 'Discovery' }))

    expect(svg).toContain('Discovery')
    expect(svg).toContain('text-anchor="middle"')
  })

  it("aligns a shape's label when asked", () => {
    const svg = boardToSvg(board({ ...shape('s'), text: 'Discovery', textAlign: 'left' }))

    expect(svg).toContain('text-anchor="start"')
  })

  it('skips a connector whose endpoints are gone', () => {
    const svg = boardToSvg(board(connector('c', 'missing', 'alsoMissing')))

    expect(svg).not.toContain('#475569')
  })

  it('draws elements in z-order, back to front', () => {
    const back = { ...sticky('back', 0, 0), zIndex: 1, color: '#111111' }
    const front = { ...sticky('front', 0, 0), zIndex: 9, color: '#999999' }
    const svg = boardToSvg(board(front, back))

    expect(svg.indexOf('#111111')).toBeLessThan(svg.indexOf('#999999'))
  })

  it('still produces a valid file for an empty board', () => {
    const svg = boardToSvg(board())

    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
  })
})

describe('boardToJson', () => {
  it('writes a versioned envelope around the elements', () => {
    const parsed = JSON.parse(boardToJson(board(sticky('a'), shape('b'))))

    expect(parsed.version).toBe(1)
    expect(parsed.elements).toHaveLength(2)
  })

  it('round-trips every element unchanged, so a board can be read back in', () => {
    const original = sticky('a', 10, 20, 'Keep me')
    const parsed = JSON.parse(boardToJson(board(original)))

    expect(parsed.elements[0]).toEqual(original)
  })

  it('orders elements back to front, so a reader can rebuild the stack', () => {
    const parsed = JSON.parse(
      boardToJson(board({ ...sticky('front'), zIndex: 5 }, { ...sticky('back'), zIndex: 1 }))
    )

    expect(parsed.elements.map((e: BoardElement) => e.id)).toEqual(['back', 'front'])
  })

  it('handles an empty board', () => {
    const parsed = JSON.parse(boardToJson(board()))

    expect(parsed.elements).toEqual([])
  })
})
