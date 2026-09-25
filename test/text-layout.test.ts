import { describe, it, expect } from 'vitest'
import { layoutText, LINE_HEIGHT } from '../src/lib/text-layout'

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
