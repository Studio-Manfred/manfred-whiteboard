import { describe, it, expect } from 'vitest'
import {
  effectiveFontSize,
  textPaddingFor,
  TEXT_PADDING,
  effectiveTextAlign,
  TEXT_ALIGNS,
  FONT_FAMILIES,
  FONT_SIZES,
  STROKE_WIDTHS,
  arrowheadsOf,
  fontFamilyStack,
  patchArrowheads,
  sharedValue,
  supportsProperty,
} from '../src/lib/element-style'
import type { BoardElement, ConnectorElement, ShapeElement, StickyElement } from '../src/types/whiteboard'

const note = {
  id: 'n', type: 'sticky', x: 0, y: 0, width: 200, height: 200, zIndex: 1,
  text: '', color: '#FFF9B1', fontSize: 16, createdAt: 0, updatedAt: 0,
} as StickyElement

const shape = {
  id: 's', type: 'shape', shapeType: 'rectangle', x: 0, y: 0, width: 120, height: 100,
  zIndex: 1, fillColor: 'transparent', strokeColor: '#0f172a', strokeWidth: 2,
  createdAt: 0, updatedAt: 0,
} as ShapeElement

const arrow = {
  id: 'c', type: 'connector', fromId: 'n', toId: 's', fromAnchor: 'right', toAnchor: 'left',
  x: 0, y: 0, width: 0, height: 0, zIndex: 1, strokeColor: '#475569', strokeWidth: 2,
  style: 'curved', createdAt: 0, updatedAt: 0,
} as ConnectorElement

const ink = {
  id: 'd', type: 'drawing', x: 0, y: 0, width: 50, height: 50, zIndex: 1,
  points: [], strokeColor: '#ef4444', strokeWidth: 3, createdAt: 0, updatedAt: 0,
} as BoardElement

describe('supportsProperty', () => {
  it('offers fill to notes and shapes only', () => {
    expect(supportsProperty(note, 'fill')).toBe(true)
    expect(supportsProperty(shape, 'fill')).toBe(true)
    expect(supportsProperty(arrow, 'fill')).toBe(false)
    expect(supportsProperty(ink, 'fill')).toBe(false)
  })

  it('offers a border to shapes, but not to notes, which have none', () => {
    expect(supportsProperty(shape, 'border')).toBe(true)
    expect(supportsProperty(note, 'border')).toBe(false)
  })

  it('offers stroke colour and thickness to arrows and ink', () => {
    for (const el of [arrow, ink]) {
      expect(supportsProperty(el, 'stroke')).toBe(true)
      expect(supportsProperty(el, 'thickness')).toBe(true)
    }
  })

  it('offers text controls where there is text', () => {
    expect(supportsProperty(note, 'font')).toBe(true)
    expect(supportsProperty(shape, 'font')).toBe(true)
    expect(supportsProperty(arrow, 'font')).toBe(false)
  })

  it('offers alignment wherever there is text', () => {
    expect(supportsProperty(note, 'align')).toBe(true)
    expect(supportsProperty(shape, 'align')).toBe(true)
    expect(supportsProperty(arrow, 'align')).toBe(false)
    expect(supportsProperty(ink, 'align')).toBe(false)
  })

  it('offers stack order to notes and shapes, which share a layer', () => {
    expect(supportsProperty(note, 'stacking')).toBe(true)
    expect(supportsProperty(shape, 'stacking')).toBe(true)
    expect(supportsProperty(arrow, 'stacking')).toBe(false)
    expect(supportsProperty(ink, 'stacking')).toBe(false)
  })

  it('offers arrowheads to arrows alone', () => {
    expect(supportsProperty(arrow, 'arrowheads')).toBe(true)
    expect(supportsProperty(ink, 'arrowheads')).toBe(false)
  })
})

describe('sharedValue', () => {
  it('reports the value when everything selected agrees', () => {
    expect(sharedValue([note, { ...note, id: 'n2' }], 'fontSize')).toBe(16)
  })

  it('reports null when they differ, so a control can show nothing', () => {
    expect(sharedValue([note, { ...note, id: 'n2', fontSize: 24 }], 'fontSize')).toBeNull()
  })

  it('reports null for an empty selection', () => {
    expect(sharedValue([], 'fontSize')).toBeNull()
  })

  it('ignores elements without the property at all', () => {
    expect(sharedValue([note, arrow], 'fontSize')).toBe(16)
  })
})

describe('arrowheadsOf', () => {
  it('reads an arrow drawn before the fields existed as end-only', () => {
    expect(arrowheadsOf(arrow)).toBe('end')
  })

  it('reads each combination', () => {
    expect(arrowheadsOf({ ...arrow, startArrow: false, endArrow: false })).toBe('none')
    expect(arrowheadsOf({ ...arrow, startArrow: true, endArrow: false })).toBe('start')
    expect(arrowheadsOf({ ...arrow, startArrow: false, endArrow: true })).toBe('end')
    expect(arrowheadsOf({ ...arrow, startArrow: true, endArrow: true })).toBe('both')
  })
})

describe('patchArrowheads', () => {
  it('turns a choice into explicit fields, never leaving them undefined', () => {
    expect(patchArrowheads('none')).toEqual({ startArrow: false, endArrow: false })
    expect(patchArrowheads('start')).toEqual({ startArrow: true, endArrow: false })
    expect(patchArrowheads('end')).toEqual({ startArrow: false, endArrow: true })
    expect(patchArrowheads('both')).toEqual({ startArrow: true, endArrow: true })
  })
})

describe('the option sets', () => {
  it('offers three font families that need no download', () => {
    expect(FONT_FAMILIES.map((f) => f.value)).toEqual(['sans', 'serif', 'mono'])
  })

  it('maps a family to a real css stack with a generic fallback', () => {
    expect(fontFamilyStack('serif')).toMatch(/serif$/)
    expect(fontFamilyStack('mono')).toMatch(/monospace$/)
    expect(fontFamilyStack(undefined)).toBe(fontFamilyStack('sans'))
  })

  it('offers a sensible ladder of sizes and thicknesses', () => {
    expect(FONT_SIZES.length).toBeGreaterThanOrEqual(4)
    expect([...FONT_SIZES].sort((a, b) => a - b)).toEqual([...FONT_SIZES])
    expect([...STROKE_WIDTHS].sort((a, b) => a - b)).toEqual([...STROKE_WIDTHS])
    expect(STROKE_WIDTHS[0]).toBeGreaterThan(0)
  })
})

describe('effectiveFontSize', () => {
  it('reports the size actually rendered when none was set', () => {
    // These are the sizes StickyNote and ShapeItem fall back to.
    expect(effectiveFontSize(note)).toBe(16)
    expect(effectiveFontSize(shape)).toBe(14)
  })

  it('reports an explicit size', () => {
    expect(effectiveFontSize({ ...note, fontSize: 24 })).toBe(24)
    expect(effectiveFontSize({ ...shape, fontSize: 32 })).toBe(32)
  })

  it('has nothing to report for elements without text', () => {
    expect(effectiveFontSize(arrow)).toBeNull()
    expect(effectiveFontSize(ink)).toBeNull()
  })
})

describe('effectiveTextAlign', () => {
  it('keeps how each type has always looked when none was chosen', () => {
    // Notes have always been left-aligned, shape labels always centred.
    expect(effectiveTextAlign(note)).toBe('left')
    expect(effectiveTextAlign(shape)).toBe('center')
  })

  it('reports an explicit alignment', () => {
    expect(effectiveTextAlign({ ...note, textAlign: 'right' })).toBe('right')
    expect(effectiveTextAlign({ ...shape, textAlign: 'left' })).toBe('left')
  })

  it('has nothing to report for elements without text', () => {
    expect(effectiveTextAlign(arrow)).toBeNull()
    expect(effectiveTextAlign(ink)).toBeNull()
  })

  it('offers the three alignments', () => {
    expect(TEXT_ALIGNS.map((a) => a.value)).toEqual(['left', 'center', 'right'])
  })
})

describe('textPaddingFor', () => {
  it('keeps a note at the padding it has always had', () => {
    expect(textPaddingFor(note)).toBe(TEXT_PADDING.sticky)
  })

  it('insets a shape label so it never leans on the border', () => {
    expect(textPaddingFor(shape)).toBeGreaterThanOrEqual(TEXT_PADDING.shape)
  })

  it('grows a shape inset with its border, which is drawn half inside', () => {
    const thin = textPaddingFor({ ...shape, strokeWidth: 2 })
    const thick = textPaddingFor({ ...shape, strokeWidth: 16 })

    expect(thick).toBe(thin + 7)
  })

  it('copes with a shape that has no stroke width set', () => {
    const bare = { ...shape }
    delete (bare as Partial<ShapeElement>).strokeWidth

    expect(textPaddingFor(bare as ShapeElement)).toBeGreaterThan(0)
  })

  it('has nothing to say about elements without text', () => {
    expect(textPaddingFor(arrow)).toBeNull()
    expect(textPaddingFor(ink)).toBeNull()
  })
})

