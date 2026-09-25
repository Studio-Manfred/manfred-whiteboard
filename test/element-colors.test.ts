import { describe, it, expect } from 'vitest'
import {
  colorName,
  colorPatchFor,
  currentFillOf,
  currentTextColorOf,
  supportsColorTarget,
  FILL_SWATCHES,
  BORDER_SWATCHES,
  TEXT_SWATCHES,
  NO_FILL,
} from '../src/lib/element-colors'
import { PASTEL_COLORS, type BoardElement } from '../src/types/whiteboard'

function element(type: BoardElement['type']): BoardElement {
  return {
    id: 'e1',
    type,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    zIndex: 1,
    createdAt: 0,
    updatedAt: 0,
  } as BoardElement
}

describe('colorPatchFor', () => {
  it("paints a sticky note's background", () => {
    expect(colorPatchFor(element('sticky'), '#FFD1DC', 'fill')).toEqual({ color: '#FFD1DC' })
  })

  it('fills a shape', () => {
    expect(colorPatchFor(element('shape'), '#CCE2FF', 'fill')).toEqual({ fillColor: '#CCE2FF' })
  })

  it("sets a shape's border separately from its fill", () => {
    expect(colorPatchFor(element('shape'), '#0f172a', 'border')).toEqual({
      strokeColor: '#0f172a',
    })
  })

  it('recolours ink and connectors through their stroke', () => {
    expect(colorPatchFor(element('drawing'), '#ef4444', 'border')).toEqual({
      strokeColor: '#ef4444',
    })
    expect(colorPatchFor(element('connector'), '#ef4444', 'border')).toEqual({
      strokeColor: '#ef4444',
    })
  })

  it('lets a shape be emptied back to transparent', () => {
    expect(colorPatchFor(element('shape'), NO_FILL, 'fill')).toEqual({ fillColor: 'transparent' })
  })

  it('returns null where the pairing makes no sense', () => {
    // A sticky note has no border of its own, and ink has no fill.
    expect(colorPatchFor(element('sticky'), '#000000', 'border')).toBeNull()
    expect(colorPatchFor(element('drawing'), '#000000', 'fill')).toBeNull()
    expect(colorPatchFor(element('connector'), '#000000', 'fill')).toBeNull()
  })
})

describe('supportsColorTarget', () => {
  it('knows which controls to offer for a selection', () => {
    expect(supportsColorTarget([element('sticky')], 'fill')).toBe(true)
    expect(supportsColorTarget([element('sticky')], 'border')).toBe(false)
    expect(supportsColorTarget([element('shape')], 'border')).toBe(true)
  })

  it('offers a control if any selected element can use it', () => {
    expect(supportsColorTarget([element('sticky'), element('drawing')], 'border')).toBe(true)
  })

  it('offers nothing for an empty selection', () => {
    expect(supportsColorTarget([], 'fill')).toBe(false)
    expect(supportsColorTarget([], 'border')).toBe(false)
  })
})

describe('swatches', () => {
  it('fills from the board palette, plus an empty option', () => {
    PASTEL_COLORS.forEach((c) => expect(FILL_SWATCHES).toContain(c))
    expect(FILL_SWATCHES).toContain(NO_FILL)
  })

  it('offers borders dark enough to read against the canvas', () => {
    expect(BORDER_SWATCHES.length).toBeGreaterThan(3)
    expect(BORDER_SWATCHES).not.toContain(NO_FILL)
  })

  it('has no duplicate swatches', () => {
    expect(new Set(FILL_SWATCHES).size).toBe(FILL_SWATCHES.length)
    expect(new Set(BORDER_SWATCHES).size).toBe(BORDER_SWATCHES.length)
  })
})

describe('colorName', () => {
  it('names every swatch it offers, so screen readers never read a hex code', () => {
    ;[...FILL_SWATCHES, ...BORDER_SWATCHES].forEach((swatch) => {
      const name = colorName(swatch)
      expect(name).toBeTruthy()
      expect(name).not.toContain('#')
    })
  })

  it('calls the empty fill what it is', () => {
    expect(colorName(NO_FILL)).toBe('No fill')
  })

  it('falls back to the value for a colour it does not know', () => {
    expect(colorName('#123456')).toBe('#123456')
  })
})

describe('currentFillOf', () => {
  it("reads a sticky note's background", () => {
    const sticky = { ...element('sticky'), color: '#FFD1DC' } as BoardElement
    expect(currentFillOf(sticky)).toBe('#FFD1DC')
  })

  it("reads a shape's fill, including an empty one", () => {
    const shape = { ...element('shape'), fillColor: 'transparent' } as BoardElement
    expect(currentFillOf(shape)).toBe(NO_FILL)

    const filled = { ...element('shape'), fillColor: '#CCE2FF' } as BoardElement
    expect(currentFillOf(filled)).toBe('#CCE2FF')
  })

  it('has nothing to report for ink or connectors', () => {
    expect(currentFillOf(element('drawing'))).toBeNull()
    expect(currentFillOf(element('connector'))).toBeNull()
  })
})

describe('TEXT_SWATCHES', () => {
  it('has no duplicates and names every swatch', () => {
    expect(new Set(TEXT_SWATCHES).size).toBe(TEXT_SWATCHES.length)
    TEXT_SWATCHES.forEach((swatch) => expect(colorName(swatch)).not.toContain('#'))
  })
})

describe('currentTextColorOf', () => {
  it('reads an explicit colour', () => {
    const sticky = { ...element('sticky'), textColor: '#dc2626' } as BoardElement
    expect(currentTextColorOf(sticky)).toBe('#dc2626')
  })

  it('falls back to slate-800 when unset, on every type that carries a label', () => {
    // Not `undefined`: a mixed selection of a coloured and an uncoloured
    // element must be comparable, the same trap `sharedValue` has for fill
    // patterns (STU-925) — filtering `undefined` out would let the coloured
    // element's value read as "shared" when it is not.
    expect(currentTextColorOf(element('sticky'))).toBe('#1e293b')
    expect(currentTextColorOf(element('shape'))).toBe('#1e293b')
    expect(currentTextColorOf(element('text'))).toBe('#1e293b')
  })

  it('has nothing to report for ink or connectors', () => {
    expect(currentTextColorOf(element('drawing'))).toBeNull()
    expect(currentTextColorOf(element('connector'))).toBeNull()
  })
})

