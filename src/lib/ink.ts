/**
 * Pen ink: a stroke whose width follows the hand, thick when slow and thin
 * when fast.
 *
 * A single SVG path cannot vary its width, so a stroke is drawn as a filled
 * outline rather than a stroked line. `perfect-freehand` generates that
 * outline; this module keeps the options in one place and turns its points
 * into a path.
 */

import { getStroke } from 'perfect-freehand'
import type { DrawingElement } from '../types/whiteboard'

export interface InkPoint {
  x: number
  y: number
  /** Stylus pressure, present only when the device reported one. */
  p?: number
}

/**
 * `thinning` is what makes speed matter: how far the width may swing from the
 * base size. The rest smooths the jitter out of a real hand.
 */
export const PEN_OPTIONS = {
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  last: true,
} as const

/**
 * The thickness control is the width of a line; perfect-freehand's `size` is a
 * base diameter that thinning then cuts into. Without this the 3px default
 * rendered as a hairline.
 */
export const INK_SIZE_SCALE = 3.5

/** Strokes drawn before the pen existed keep their uniform width. */
export function isPenStroke(element: DrawingElement): boolean {
  return element.ink === 'pen'
}

/** Outline points from perfect-freehand, as a closed SVG path. */
function toPath(outline: number[][]): string {
  if (outline.length === 0) return ''

  const [first, ...rest] = outline
  let d = `M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`

  // Quadratic segments through the midpoints keep the outline smooth.
  for (let i = 0; i < rest.length; i++) {
    const [x0, y0] = i === 0 ? first : rest[i - 1]
    const [x1, y1] = rest[i]
    d += ` Q ${x0.toFixed(2)} ${y0.toFixed(2)} ${((x0 + x1) / 2).toFixed(2)} ${(
      (y0 + y1) /
      2
    ).toFixed(2)}`
  }

  return `${d} Z`
}

/**
 * The filled outline of a stroke.
 *
 * Pressure is simulated from velocity unless the device recorded a real one —
 * a mouse reports a constant 0.5, which would draw a flat line.
 */
export function penOutlinePath(points: readonly InkPoint[], size: number): string {
  if (points.length === 0) return ''

  const hasRealPressure = points.some((point) => point.p !== undefined)
  const input = points.map((point) => [point.x, point.y, point.p ?? 0.5])

  return toPath(
    getStroke(input, {
      ...PEN_OPTIONS,
      size: size * INK_SIZE_SCALE,
      simulatePressure: !hasRealPressure,
    })
  )
}
