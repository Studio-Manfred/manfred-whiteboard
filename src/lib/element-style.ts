/**
 * What can be styled on a given element, and what the current selection has in
 * common — the model behind the floating properties bar.
 */

import type {
  BoardElement,
  ConnectorElement,
  FontFamily,
  TextAlign,
} from '../types/whiteboard'

/** A control the properties bar can offer. */
export type StyleProperty =
  | 'fill'
  | 'border'
  | 'stroke'
  | 'thickness'
  | 'font'
  | 'arrowheads'
  | 'stacking'
  | 'align'

export type Arrowheads = 'none' | 'start' | 'end' | 'both'

export const FONT_SIZES = [12, 14, 16, 20, 24, 32] as const
export const STROKE_WIDTHS = [1, 2, 4, 8] as const

export const FONT_FAMILIES: ReadonlyArray<{ value: FontFamily; label: string }> = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
]

const FONT_STACKS: Record<FontFamily, string> = {
  sans: 'Inter, system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"SFMono-Regular", Menlo, Consolas, monospace',
}

/** The CSS stack for a family, falling back to the board's default. */
export function fontFamilyStack(family: FontFamily | undefined): string {
  return FONT_STACKS[family ?? 'sans']
}

/** Whether a control applies to this element at all. */
export function supportsProperty(element: BoardElement, property: StyleProperty): boolean {
  switch (property) {
    case 'fill':
      return element.type === 'sticky' || element.type === 'shape'
    case 'border':
      // Notes are flat cards with no border in the model.
      return element.type === 'shape'
    case 'stroke':
    case 'thickness':
      return element.type === 'connector' || element.type === 'drawing'
    case 'font':
    case 'align':
      return element.type === 'sticky' || element.type === 'shape'
    case 'arrowheads':
      return element.type === 'connector'
    case 'stacking':
      // Arrows and ink live on their own layers beneath these.
      return element.type === 'sticky' || element.type === 'shape'
    default:
      return false
  }
}

/**
 * The value every element in the selection agrees on, or null when they differ
 * — so a control can show a value rather than lie about one. Elements without
 * the property are ignored.
 */
export function sharedValue<T>(
  elements: readonly BoardElement[],
  key: string
): T | null {
  const values = elements
    .map((el) => (el as unknown as Record<string, unknown>)[key])
    .filter((value) => value !== undefined)

  if (values.length === 0) return null

  const [first, ...rest] = values
  return rest.every((value) => value === first) ? (first as T) : null
}

export const TEXT_ALIGNS: ReadonlyArray<{ value: TextAlign; label: string }> = [
  { value: 'left', label: 'Align left' },
  { value: 'center', label: 'Align centre' },
  { value: 'right', label: 'Align right' },
]

/** How each type has always looked, so existing boards are unchanged. */
const DEFAULT_TEXT_ALIGNS = { sticky: 'left', shape: 'center' } as const

/** The alignment an element's text is actually drawn with. */
export function effectiveTextAlign(element: BoardElement): TextAlign | null {
  if (element.type === 'sticky') return element.textAlign ?? DEFAULT_TEXT_ALIGNS.sticky
  if (element.type === 'shape') return element.textAlign ?? DEFAULT_TEXT_ALIGNS.shape
  return null
}

/** The sizes StickyNote and ShapeItem render at when none is set. */
const DEFAULT_FONT_SIZES = { sticky: 16, shape: 14 } as const

/**
 * The size an element's text is actually drawn at, so a control can show the
 * real value rather than a blank for "never set".
 */
export function effectiveFontSize(element: BoardElement): number | null {
  if (element.type === 'sticky') return element.fontSize ?? DEFAULT_FONT_SIZES.sticky
  if (element.type === 'shape') return element.fontSize ?? DEFAULT_FONT_SIZES.shape
  return null
}

/** An arrow drawn before these fields existed has a head at the end only. */
export function arrowheadsOf(connector: ConnectorElement): Arrowheads {
  const start = connector.startArrow ?? false
  const end = connector.endArrow ?? true

  if (start && end) return 'both'
  if (start) return 'start'
  if (end) return 'end'
  return 'none'
}

/** Always writes both fields, so the value never falls back to the default. */
export function patchArrowheads(choice: Arrowheads): {
  startArrow: boolean
  endArrow: boolean
} {
  return {
    startArrow: choice === 'start' || choice === 'both',
    endArrow: choice === 'end' || choice === 'both',
  }
}
