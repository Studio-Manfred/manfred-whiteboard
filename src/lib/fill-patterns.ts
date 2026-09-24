/**
 * Retro 1-bit mono fill patterns for shapes.
 *
 * A tile is pure geometry — absolute SVG path commands inside a small square —
 * with no colour of its own. A shape supplies the two colours it already has
 * (its fill for the tile background, its stroke for the ink) so a pattern
 * never needs a third colour field, and two consumers (the canvas and the
 * export) build their own markup from the same tile, the way `ink.ts`'s
 * `penOutlinePath` serves `DrawingItem` and `board-export.ts` from one path.
 */

import type { ShapeElement } from '../types/whiteboard'

export type FillPattern = 'hatch' | 'crosshatch' | 'dots' | 'checker' | 'scanline'

/** Picker order. */
export const FILL_PATTERNS: readonly FillPattern[] = [
  'hatch',
  'crosshatch',
  'dots',
  'checker',
  'scanline',
]

/** A single stroked line or filled shape inside a tile. */
export interface PatternMark {
  kind: 'stroke' | 'fill'
  d: string
}

/** A repeatable square of ink. `strokeWidth` is also the line weight for any
 * `stroke` mark, and the bleed a mark may cross the tile edge by without
 * leaving a seam where the tile repeats. */
export interface PatternTile {
  size: number
  strokeWidth: number
  marks: PatternMark[]
}

/**
 * Each tile is a small square (`patternUnits="userSpaceOnUse"`) tiled edge to
 * edge. A single 45°, corner-to-corner line repeats seamlessly because
 * diagonally adjacent tiles meet exactly at the corner — no `patternTransform`
 * needed. Coverage is tuned by the ratio of `strokeWidth` (or fill area) to
 * `size`, not by eye.
 */
const TILES: Record<FillPattern, PatternTile> = {
  // One diagonal per tile, ~25% ink: strokeWidth·√2 / size ≈ 0.25.
  hatch: {
    size: 16,
    strokeWidth: 2.8,
    marks: [{ kind: 'stroke', d: 'M 0 0 L 16 16' }],
  },
  // Both diagonals — the same line as hatch plus its mirror.
  crosshatch: {
    size: 16,
    strokeWidth: 2.6,
    marks: [
      { kind: 'stroke', d: 'M 0 0 L 16 16' },
      { kind: 'stroke', d: 'M 0 16 L 16 0' },
    ],
  },
  // One Ben-Day dot per tile, r=3.5 on a 16×16 tile: π·3.5² / 16² ≈ 15%.
  // Two semicircular arcs (large-arc 0, sweep 1) is the standard way to draw a
  // full circle with only absolute commands.
  dots: {
    size: 16,
    strokeWidth: 1,
    marks: [
      { kind: 'fill', d: 'M 4.5 8 A 3.5 3.5 0 0 1 11.5 8 A 3.5 3.5 0 0 1 4.5 8 Z' },
    ],
  },
  // Two opposite quadrants filled: exactly half the tile.
  checker: {
    size: 16,
    strokeWidth: 1,
    marks: [
      { kind: 'fill', d: 'M 0 0 L 8 0 L 8 8 L 0 8 Z' },
      { kind: 'fill', d: 'M 8 8 L 16 8 L 16 16 L 8 16 Z' },
    ],
  },
  // One horizontal rule per tile, ~30% ink: strokeWidth / size = 0.3.
  scanline: {
    size: 10,
    strokeWidth: 3,
    marks: [{ kind: 'stroke', d: 'M 0 5 L 10 5' }],
  },
}

/** The tile for a pattern. Deterministic, so the canvas and the export — two
 * independent renderers — always draw the same ink. */
export function patternTile(pattern: FillPattern): PatternTile {
  return TILES[pattern]
}

const LABELS: Record<FillPattern, string> = {
  hatch: 'Diagonal hatch',
  crosshatch: 'Crosshatch',
  dots: 'Ben-Day dots',
  checker: 'Checkerboard',
  scanline: 'Scanline',
}

/** Accessible name for the picker. Boards can carry a pattern id newer than
 * this build knows about, so an unrecognised one still gets a label rather
 * than throwing. */
export function patternLabel(pattern: FillPattern): string {
  return LABELS[pattern] ?? 'Pattern'
}

/** A def is scoped to the element it fills, so two patterned shapes never
 * collide and axe never sees a duplicate id. */
export function patternIdFor(elementId: string): string {
  return `pattern-${elementId}`
}

/**
 * What a shape's `fill` attribute should be. A known pattern points at its
 * own def; anything else — no pattern, or one this build has never heard of
 * because a peer on a newer version synced it over Yjs — falls back to the
 * plain fill colour rather than throwing or rendering blank.
 */
export function patternFill(element: ShapeElement): string {
  const { pattern } = element

  if (pattern && FILL_PATTERNS.includes(pattern)) {
    return `url(#${patternIdFor(element.id)})`
  }

  return element.fillColor || 'transparent'
}

/** Chosen in the picker, this clears a shape back to a solid fill. */
export const NO_PATTERN = 'none' as const

/**
 * The pattern a shape currently shows, never `undefined` — mirrors
 * `currentFillOf`/`NO_FILL` in `element-colors.ts`. `sharedValue` filters out
 * `undefined`, which would let a plain shape drop out of a mixed selection's
 * comparison instead of counting as disagreement; folding "no pattern" into a
 * real value keeps that comparison honest.
 */
export function currentPatternOf(element: ShapeElement): FillPattern | typeof NO_PATTERN {
  return element.pattern ?? NO_PATTERN
}
