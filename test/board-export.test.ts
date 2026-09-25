import { describe, it, expect } from 'vitest'
import { boardBounds, boardToSvg, boardToJson, EXPORT_PADDING } from '../src/lib/board-export'
import { patternIdFor, type FillPattern } from '../src/lib/fill-patterns'
import type {
  BoardElement,
  ConnectorElement,
  DrawingElement,
  ShapeElement,
  StickyElement,
  TextElement,
} from '../src/types/whiteboard'
import { layoutText, estimateMeasure } from '../src/lib/text-layout'

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

/**
 * A shape carrying the one new field fill patterns add. The cast is what lets
 * these tests describe the field before it exists on the type.
 */
function patternedShape(
  id: string,
  pattern: FillPattern,
  overrides: Partial<ShapeElement> = {}
): ShapeElement {
  return { ...shape(id), ...overrides, pattern } as ShapeElement
}

/** The one `<pattern>` block bearing this id, so its insides can be read. */
function patternDef(svg: string, id: string): string {
  return svg.match(new RegExp(`<pattern[^>]*id="${id}"[\\s\\S]*?</pattern>`))?.[0] ?? ''
}

function countOf(svg: string, needle: string): number {
  return svg.split(needle).length - 1
}

/** The drawing itself, with the definitions taken out — a tile reuses the
 * shape's own colours, so the body is the only place to ask what it is filled with. */
function withoutDefs(svg: string): string {
  return svg.replace(/<defs>[\s\S]*?<\/defs>/g, '')
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

function textEl(over: Partial<TextElement> = {}): TextElement {
  return {
    id: 't1',
    type: 'text',
    x: 10,
    y: 20,
    width: 200,
    height: 54,
    zIndex: 1,
    createdAt: 0,
    updatedAt: 0,
    text: 'hello world',
    fontSize: 20,
    ...over,
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

  it("uses a note's textColor when set", () => {
    const svg = boardToSvg(board({ ...sticky('a', 0, 0, 'Hello'), textColor: '#dc2626' }))
    expect(svg).toContain('fill="#dc2626"')
  })

  it("falls back to slate-800 for a note's text when textColor is unset", () => {
    const svg = boardToSvg(board(sticky('a', 0, 0, 'Hello')))
    expect(svg).toContain('fill="#1e293b"')
  })

  it("escapes a note's textColor so it cannot inject markup", () => {
    // textColor is shared data from Yjs, so a peer can write any string even
    // if the UI only offers palette swatches — the same trap as text objects.
    const malicious = '"><script>alert("xss")</script><x="'
    const svg = boardToSvg(board({ ...sticky('a', 0, 0, 'Hello'), textColor: malicious }))

    expect(svg).toMatch(/<text[^>]*fill="&quot;&gt;/)
    expect(svg).not.toContain('<script>')
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

  it("uses a shape's textColor when set", () => {
    const svg = boardToSvg(board({ ...shape('s'), text: 'Discovery', textColor: '#16a34a' }))
    expect(svg).toContain('fill="#16a34a"')
  })

  it("falls back to slate-800 for a shape label when textColor is unset", () => {
    const svg = boardToSvg(board({ ...shape('s'), text: 'Discovery' }))
    expect(svg).toContain('fill="#1e293b"')
  })

  it("escapes a shape's textColor so it cannot inject markup", () => {
    const malicious = '"><script>alert("xss")</script><x="'
    const svg = boardToSvg(
      board({ ...shape('s'), text: 'Discovery', textColor: malicious })
    )

    expect(svg).toMatch(/<text[^>]*fill="&quot;&gt;/)
    expect(svg).not.toContain('<script>')
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

describe('boardToSvg, with fill patterns', () => {
  it('defines nothing for a board with no patterns, as it always has', () => {
    const svg = boardToSvg(board(shape('s')))

    expect(svg).not.toContain('<defs')
    expect(svg).not.toContain('<pattern')
  })

  it('defines one pattern for a patterned shape, named after the element', () => {
    const svg = boardToSvg(board(patternedShape('s', 'hatch')))

    expect(countOf(svg, '<pattern')).toBe(1)
    expect(svg).toContain(`id="${patternIdFor('s')}"`)
  })

  it('haloes a label that sits on a pattern', () => {
    // Same reason as the canvas: dark text on ~50% ink is unreadable. SVG
    // gets there with paint-order rather than a text-shadow.
    const svg = boardToSvg(board(patternedShape('s', 'checker', { text: 'Roadmap' })))

    expect(svg).toContain('paint-order="stroke"')
    expect(svg).toContain('stroke="#CCE2FF"')
  })

  it('leaves an unpatterned label unhaloed, as it always was', () => {
    const svg = boardToSvg(board({ ...shape('s'), text: 'Roadmap' }))

    expect(svg).not.toContain('paint-order')
  })

  it('anchors the tile to the shape, not to the board origin', () => {
    // The canvas gives every shape its own <svg>, so a tile starts at that
    // shape's corner. The export shares one board-wide viewBox, where a tile
    // with no origin of its own would start at the board origin instead — the
    // same pattern at a different phase than the one on screen.
    const svg = boardToSvg(board(patternedShape('s', 'checker', { x: 37, y: 91 })))
    const def = patternDef(svg, patternIdFor('s'))

    expect(def).toContain('x="37"')
    expect(def).toContain('y="91"')
  })

  it('points the shape at its own def, as a single fill', () => {
    // One fill attribute, not a patterned overlay laid over a solid shape —
    // an overlay would cover the inner half of the border stroke.
    const body = withoutDefs(boardToSvg(board(patternedShape('s', 'dots'))))

    expect(body).toContain(`fill="url(#${patternIdFor('s')})"`)
    expect(body).not.toContain('fill="#CCE2FF"')
    expect(countOf(body, 'fill=')).toBe(2) // the page background, and the shape
  })

  it('gives two shapes sharing a pattern a def each, so no id repeats', () => {
    const svg = boardToSvg(board(patternedShape('a', 'checker'), patternedShape('b', 'checker')))

    expect(countOf(svg, '<pattern')).toBe(2)
    expect(svg).toContain(`id="${patternIdFor('a')}"`)
    expect(svg).toContain(`id="${patternIdFor('b')}"`)
  })

  it('paints the tile background in the shape fill and the ink in its border colour', () => {
    // No new colour field: the tile reuses the two the shape already carries.
    const def = patternDef(boardToSvg(board(patternedShape('s', 'crosshatch'))), 'pattern-s')

    expect(def).toContain('#CCE2FF')
    expect(def).toContain('#0f172a')
  })

  it('keeps the border on the shape itself rather than on an overlay', () => {
    // An overlay shape would be drawn over the inner half of the border stroke.
    const svg = boardToSvg(board(patternedShape('s', 'scanline', { shapeType: 'circle' })))

    expect(countOf(svg, '<ellipse')).toBe(1)
    expect(svg).toContain('stroke="#0f172a"')
  })

  it('falls back to a solid fill for a pattern it does not know', () => {
    const svg = boardToSvg(board(patternedShape('s', 'mosaic' as FillPattern)))

    expect(svg).not.toContain('<pattern')
    expect(svg).toContain('fill="#CCE2FF"')
  })

  it('puts the markers and the patterns in one defs block', () => {
    const svg = boardToSvg(
      board(sticky('a', 0, 0), sticky('b', 400, 0), connector('c', 'a', 'b'), patternedShape('s', 'hatch'))
    )

    expect(countOf(svg, '<defs')).toBe(1)
    expect(svg).toContain('<marker')
    expect(svg).toContain('<pattern')
  })

  it('copes with a patterned shape that has no fill colour', () => {
    const svg = boardToSvg(board(patternedShape('s', 'dots', { fillColor: '' })))

    expect(svg).toContain(`id="${patternIdFor('s')}"`)
    expect(svg).not.toContain('fill=""')
  })
})

describe('boardToSvg, with text objects', () => {
  it('emits one tspan per laid-out line', () => {
    const el = textEl()
    const expected = layoutText(el.text, el.width, el, estimateMeasure()).lines
    const svg = boardToSvg(board(el))

    expect(countOf(svg, '<tspan')).toBe(expected.length)
  })

  it('breaks exactly where the canvas breaks', () => {
    // The whole point of the design: one module, one measurer, so the
    // exported line breaks cannot drift from the ones on screen.
    const el = textEl({ text: 'the quick brown fox jumps', width: 120 })
    const measure = estimateMeasure()
    const { lines } = layoutText(el.text, el.width, el, measure)
    const svg = boardToSvg(board(el))

    // Plain words, so no XML escaping is involved — assert them directly.
    for (const line of lines) expect(svg).toContain(`>${line}</tspan>`)
    expect(countOf(svg, '<tspan')).toBe(lines.length)
  })

  it('cuts a word too long for the line, which wrapText would not', () => {
    // The guard against textSvg drifting back to its own wrapping. wrapText and
    // estimateMeasure share the same 0.55 glyph ratio, so they agree on ordinary
    // prose — an over-long word is where they part company, because only
    // layoutText breaks mid-word.
    const svg = boardToSvg(board(textEl({ text: 'A'.repeat(40), width: 120, fontSize: 20 })))

    expect(countOf(svg, '<tspan')).toBeGreaterThan(1)
  })

  it('uses textColor when set', () => {
    expect(boardToSvg(board(textEl({ textColor: '#dc2626' })))).toContain('fill="#dc2626"')
  })

  it('falls back to slate-800 when textColor is unset', () => {
    expect(boardToSvg(board(textEl()))).toContain('fill="#1e293b"')
  })

  it('escapes malicious content in textColor so it cannot inject markup', () => {
    // textColor is shared data from Yjs, so a peer can write any string even if
    // the UI only offers palette swatches. Unescaped interpolation could close
    // the fill attribute and inject markup.
    const malicious = '"><script>alert("xss")</script><x="'
    const svg = boardToSvg(board(textEl({ textColor: malicious })))

    // If the value were not escaped, it would close the fill attribute and inject
    // a script tag. With proper escaping, the fill attribute closes correctly and
    // the text renders normally, with no injected markup.
    expect(svg).toMatch(/<text[^>]*fill="&quot;&gt;/)
    expect(svg).toContain('</text>')
    expect(svg).toContain('<tspan')
  })

  it('draws no box, no fill and no border around it', () => {
    const svg = withoutDefs(boardToSvg(board(textEl())))
    // Only the page background rect; a text object paints nothing but words.
    expect(countOf(svg, '<rect')).toBe(1)
  })

  it('emits nothing for an empty text object', () => {
    expect(boardToSvg(board(textEl({ text: '' })))).not.toContain('<tspan')
  })

  it('moves the anchor when textAlign is set, not just left', () => {
    // Mirrors the sticky note's own alignment test above. `textSvg` reads
    // `align` for both `textAnchorFor` and `textXFor` — a hardcoded 'left'
    // (i.e. always `text-anchor="start"`) would still pass every other test
    // in this describe block, since none of them ever set textAlign.
    const svg = boardToSvg(board(textEl({ textAlign: 'center' })))

    expect(svg).toContain('text-anchor="middle"')
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
