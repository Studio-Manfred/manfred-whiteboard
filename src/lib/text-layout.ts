/**
 * Text layout for elements whose height follows their content.
 *
 * The measuring function is injected rather than reached for, because the two
 * callers need different ones: the browser hands in a real `measureText`, a
 * test hands in something deterministic. Both get the same wrapping from the
 * same code, which is what stops the canvas and text elements disagreeing about
 * where a line breaks.
 *
 * Note: Sticky notes and shape labels still use the older `wrapText` function
 * in `board-export.ts`. Routing them through this module is out of scope and
 * pending a separate ticket.
 */

import type { FontFamily } from '../types/whiteboard'
import { fontFamilyStack } from './element-style'

/** Width of `text` in pixels, rendered in the CSS font shorthand `font`. */
export type Measure = (text: string, font: string) => number

export interface TextLayout {
  lines: string[]
  height: number
}

/** Line box as a multiple of the font size. */
export const LINE_HEIGHT = 1.35

/**
 * The CSS font shorthand `measureText` expects.
 * Format: "{fontSize}px {fontFamily}" — this shape is a contract that
 * `estimateMeasure` depends on; it parses the size from the start of the string.
 */
export function cssFont(fontSize: number, fontFamily?: FontFamily): string {
  return `${fontSize}px ${fontFamilyStack(fontFamily)}`
}

/** Splits one paragraph, breaking a word that cannot fit on a line of its own. */
function wrapParagraph(
  paragraph: string,
  maxWidth: number,
  font: string,
  measure: Measure
): string[] {
  // Treat empty or whitespace-only paragraphs as empty lines.
  if (paragraph.trim() === '') return ['']

  const lines: string[] = []
  let line = ''

  const pushWord = (word: string) => {
    let rest = word
    // A word wider than the box is cut. At least one character always moves,
    // so a box too narrow for any character still terminates.
    while (measure(rest, font) > maxWidth && rest.length > 1) {
      let take = rest.length - 1
      while (take > 1 && measure(rest.slice(0, take), font) > maxWidth) take--
      lines.push(rest.slice(0, take))
      rest = rest.slice(take)
    }
    line = rest
  }

  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word

    if (measure(candidate, font) <= maxWidth) {
      line = candidate
      continue
    }

    if (line) lines.push(line)
    pushWord(word)
  }

  if (line) lines.push(line)
  return lines
}

/** Wraps `text` to `maxWidth` and reports the height those lines occupy. */
export function layoutText(
  text: string,
  maxWidth: number,
  opts: { fontSize: number; fontFamily?: FontFamily },
  measure: Measure
): TextLayout {
  if (text === '') return { lines: [], height: 0 }

  const font = cssFont(opts.fontSize, opts.fontFamily)
  const lines = text.split('\n').flatMap((p) => wrapParagraph(p, maxWidth, font, measure))

  return { lines, height: lines.length * opts.fontSize * LINE_HEIGHT }
}

/** Average-glyph estimate, for callers with no canvas — tests, and any
 * non-browser consumer. Never throws, so layout always produces something. */
export function estimateMeasure(): Measure {
  const GLYPH_RATIO = 0.55
  return (text, font) => {
    const size = Number.parseFloat(font) || 16
    return text.length * size * GLYPH_RATIO
  }
}

/** Real browser metrics over one cached 2D context, memoised per font. */
export function canvasMeasure(): Measure {
  if (typeof document === 'undefined') return estimateMeasure()

  const context = document.createElement('canvas').getContext('2d')
  if (!context) return estimateMeasure()

  const cache = new Map<string, number>()

  return (text, font) => {
    const key = `${font}\u0000${text}`
    const hit = cache.get(key)
    if (hit !== undefined) return hit

    context.font = font
    const width = context.measureText(text).width
    cache.set(key, width)
    return width
  }
}
