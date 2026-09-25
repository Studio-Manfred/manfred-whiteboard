/**
 * Where a chosen colour actually lands depends on what is selected: a sticky
 * note has a background, a shape has a fill and a border, ink and connectors
 * only have a stroke.
 */

import { PASTEL_COLORS, type BoardElement } from '../types/whiteboard'

/** Which part of an element a swatch paints. */
export type ColorTarget = 'fill' | 'border'

/** Chosen as a fill, this empties the shape rather than painting it. */
export const NO_FILL = 'transparent'

export const FILL_SWATCHES: readonly string[] = [NO_FILL, ...PASTEL_COLORS]

/** Dark enough to read against the canvas and against every pastel fill. */
export const BORDER_SWATCHES: readonly string[] = [
  '#0f172a', // Ink
  '#475569', // Slate
  '#2563eb', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#d97706', // Amber
  '#7c3aed', // Violet
]

/** Near-black, slate, red, amber, green, blue, violet — dark enough to read
 * as body text, on a note, a shape label or a bare text object alike. */
export const TEXT_SWATCHES: readonly string[] = [
  '#0f172a', // Ink
  '#475569', // Slate
  '#dc2626', // Red
  '#d97706', // Amber
  '#16a34a', // Green
  '#2563eb', // Blue
  '#7c3aed', // Violet
]

const COLOR_NAMES: Record<string, string> = {
  [NO_FILL]: 'No fill',
  '#FFF9B1': 'Sunbeam Yellow',
  '#D4F0F0': 'Mint Frost',
  '#FFD1DC': 'Coral Pink',
  '#CCE2FF': 'Sky Blue',
  '#E8D7FF': 'Lavender',
  '#FFE5D4': 'Peach Cream',
  '#0f172a': 'Ink',
  '#475569': 'Slate',
  '#2563eb': 'Blue',
  '#dc2626': 'Red',
  '#16a34a': 'Green',
  '#d97706': 'Amber',
  '#7c3aed': 'Violet',
}

/** A human name for a swatch — screen readers should never read a hex code. */
export function colorName(color: string): string {
  return COLOR_NAMES[color] ?? color
}

/**
 * The patch that applies `color` to an element, or `null` when that element
 * has no such part to paint.
 */
export function colorPatchFor(
  element: BoardElement,
  color: string,
  target: ColorTarget
): Partial<BoardElement> | null {
  if (target === 'fill') {
    if (element.type === 'sticky') return { color } as Partial<BoardElement>
    if (element.type === 'shape') return { fillColor: color } as Partial<BoardElement>
    return null
  }

  if (element.type === 'shape' || element.type === 'drawing' || element.type === 'connector') {
    return { strokeColor: color } as Partial<BoardElement>
  }

  return null
}

/** The fill an element currently shows, or null when it has no fill at all. */
export function currentFillOf(element: BoardElement): string | null {
  if (element.type === 'sticky') return element.color
  if (element.type === 'shape') return element.fillColor || NO_FILL
  return null
}

/**
 * The text colour an element currently shows, or null when it has no label to
 * colour at all. Never `undefined` for sticky/shape/text — mirrors
 * `currentFillOf`'s sentinel so a mixed selection of a coloured and an
 * uncoloured element compares as *disagreeing* rather than one of them
 * silently dropping out of the comparison (the `sharedValue` trap from
 * STU-925's fill patterns).
 */
export function currentTextColorOf(element: BoardElement): string | null {
  if (element.type === 'sticky' || element.type === 'shape' || element.type === 'text') {
    return element.textColor ?? '#1e293b'
  }
  return null
}

/** True when at least one selected element can use this control. */
export function supportsColorTarget(
  elements: readonly BoardElement[],
  target: ColorTarget
): boolean {
  return elements.some((el) => colorPatchFor(el, '#000000', target) !== null)
}
