import { describe, it, expect, vi } from 'vitest'
import { layoutText, LINE_HEIGHT, cssFont, estimateMeasure, canvasMeasure, type Measure } from '../src/lib/text-layout'

/** Every character is exactly 10px, so wrapping is arithmetic, not a guess. */
const tenPx = (text: string) => text.length * 10

const opts = { fontSize: 20 }

describe('layoutText', () => {
  it('keeps text that fits on one line', () => {
    expect(layoutText('hello', 100, opts, tenPx).lines).toEqual(['hello'])
  })

  it('wraps at a space when the next word would not fit', () => {
    // 'hello world' is 110px; 100px fits only 'hello'.
    expect(layoutText('hello world', 100, opts, tenPx).lines).toEqual(['hello', 'world'])
  })

  it('treats a newline as a hard break, even mid-line', () => {
    expect(layoutText('a\nb', 1000, opts, tenPx).lines).toEqual(['a', 'b'])
  })

  it('keeps an empty paragraph as an empty line', () => {
    expect(layoutText('a\n\nb', 1000, opts, tenPx).lines).toEqual(['a', '', 'b'])
  })

  it('preserves whitespace-only lines as empty lines', () => {
    expect(layoutText('a\n  \nb', 1000, opts, tenPx).lines).toEqual(['a', '', 'b'])
  })

  it('collapses internal whitespace runs but preserves line structure', () => {
    expect(layoutText('a  b', 1000, opts, tenPx).lines).toEqual(['a b'])
  })

  it('trims leading indentation, a consequence of splitting on whitespace', () => {
    expect(layoutText('    indented', 1000, opts, tenPx).lines).toEqual(['indented'])
  })

  it('measures with the shorthand cssFont builds, not a string of its own', () => {
    const seen: string[] = []
    const recording: Measure = (text, font) => {
      seen.push(font)
      return text.length * 10
    }

    layoutText('hello world', 100, { fontSize: 20 }, recording)

    expect(seen.length).toBeGreaterThan(0)
    for (const font of seen) expect(font).toMatch(/^20px /)
  })

  it('breaks a word that cannot fit on any line', () => {
    // 'abcdefgh' is 80px in a 30px box: three characters per line.
    expect(layoutText('abcdefgh', 30, opts, tenPx).lines).toEqual(['abc', 'def', 'gh'])
  })

  it('makes progress even when not one character fits', () => {
    // A zero-width box must still terminate, one character per line.
    expect(layoutText('abc', 0, opts, tenPx).lines).toEqual(['a', 'b', 'c'])
  })

  it('is empty for empty text', () => {
    const layout = layoutText('', 100, opts, tenPx)
    expect(layout.lines).toEqual([])
    expect(layout.height).toBe(0)
  })

  it('derives height from the line count', () => {
    const layout = layoutText('hello world', 100, opts, tenPx)
    expect(layout.height).toBe(2 * 20 * LINE_HEIGHT)
  })
})

describe('cssFont', () => {
  it('produces a string with fontSize at the start', () => {
    expect(cssFont(20)).toMatch(/^20px /)
  })
})

describe('estimateMeasure', () => {
  it('estimates text width using a glyph ratio', () => {
    const measure = estimateMeasure()
    const width = measure('hello', '20px sans-serif')
    // 5 chars * 20px * 0.55 = 55px
    expect(width).toBeCloseTo(55)
  })

  it('parses font size from the font shorthand', () => {
    const measure = estimateMeasure()
    const width20 = measure('x', '20px sans-serif')
    const width10 = measure('x', '10px sans-serif')
    expect(width20).toBe(2 * width10)
  })

  it('falls back to 16px when font size cannot be parsed', () => {
    const measure = estimateMeasure()
    // "bold 20px Inter" is malformed (bold before size)
    const widthMalformed = measure('x', 'bold 20px Inter')
    const width16 = measure('x', '16px sans-serif')
    // Both should use 16px fallback
    expect(widthMalformed).toBeCloseTo(width16, 0)
  })
})

describe('canvasMeasure, with no canvas available', () => {
  it('falls back to estimateMeasure when getContext returns null', () => {
    // In jsdom (test environment), canvas getContext('2d') returns null,
    // so canvasMeasure should return the fallback estimator
    const measure = canvasMeasure()
    const width = measure('hello', '20px sans-serif')
    // Should estimate: 5 * 20 * 0.55 = 55
    expect(width).toBeCloseTo(55)
  })

  it('estimates deterministically across calls when canvas unavailable', () => {
    const measure = canvasMeasure()
    // In jsdom, this uses the estimator, but we verify determinism
    // by checking that calling twice gives the same result
    const width1 = measure('hello', '20px sans-serif')
    const width2 = measure('hello', '20px sans-serif')
    expect(width1).toBe(width2)
  })

  it('estimates correctly for different fonts when canvas unavailable', () => {
    const measure = canvasMeasure()
    const width20 = measure('x', '20px sans-serif')
    const width10 = measure('x', '10px sans-serif')
    expect(width20).toBeGreaterThan(width10)
  })

  it('estimates correctly for different texts when canvas unavailable', () => {
    const measure = canvasMeasure()
    const widthShort = measure('x', '20px sans-serif')
    const widthLong = measure('xxxx', '20px sans-serif')
    expect(widthLong).toBeGreaterThan(widthShort)
  })
})

describe('canvasMeasure, with canvas available', () => {
  it('measures once per distinct font and text, then serves from cache', () => {
    const measureText = vi.fn((text: string) => ({ width: text.length * 7 }))
    const stub = { font: '', measureText } as unknown as CanvasRenderingContext2D
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(stub as never)

    const measure = canvasMeasure()

    expect(measure('abc', '16px serif')).toBe(21)
    expect(measure('abc', '16px serif')).toBe(21)
    expect(measureText).toHaveBeenCalledTimes(1) // second call came from the cache

    measure('abc', '20px serif')
    expect(measureText).toHaveBeenCalledTimes(2) // a different font is a different key

    spy.mockRestore()
  })
})
