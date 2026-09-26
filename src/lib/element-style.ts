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
  | 'pattern'
  | 'textColor'

export type Arrowheads = 'none' | 'start' | 'end' | 'both'

export const FONT_SIZES = [
  12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80, 96, 128, 200, 320, 500,
] as const
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
      return element.type === 'sticky' || element.type === 'shape' || element.type === 'text'
    case 'arrowheads':
      return element.type === 'connector'
    case 'stacking':
      // Arrows are derived from the elements they join, so they stay on their
      // own layer; everything else shares one stack.
      return element.type !== 'connector'
    case 'pattern':
      // Only ShapeElement carries `pattern`, and only ShapeItem draws one.
      return element.type === 'shape'
    case 'textColor':
      // Every type with a label can recolour it; a connector's stroke and
      // ink's stroke already have their own colour control instead.
      return element.type === 'sticky' || element.type === 'shape' || element.type === 'text'
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

/** Base inset between an element's edge and its text. */
export const TEXT_PADDING = { sticky: 16, shape: 12, text: 0 } as const

/**
 * How far text sits from an element's edge.
 *
 * A shape's stroke is drawn centred on its bounds, so half of it falls inside:
 * a thick border would otherwise crowd the label against the edge. The inset
 * grows with the border instead. A bare text object has no border to lean on,
 * so padding would only push words away from bounds nobody can see and make
 * the selection outline sit wide of the text.
 */
export function textPaddingFor(element: BoardElement): number | null {
  if (element.type === 'sticky') return TEXT_PADDING.sticky
  if (element.type === 'shape') return TEXT_PADDING.shape + (element.strokeWidth ?? 2) / 2
  if (element.type === 'text') return TEXT_PADDING.text
  return null
}

/** How each type has always looked, so existing boards are unchanged. Text
 * is bare words on a board, not a label centred in a box, so it starts left. */
const DEFAULT_TEXT_ALIGNS = { sticky: 'left', shape: 'center', text: 'left' } as const

/** The alignment an element's text is actually drawn with. */
export function effectiveTextAlign(element: BoardElement): TextAlign | null {
  if (element.type === 'sticky') return element.textAlign ?? DEFAULT_TEXT_ALIGNS.sticky
  if (element.type === 'shape') return element.textAlign ?? DEFAULT_TEXT_ALIGNS.shape
  if (element.type === 'text') return element.textAlign ?? DEFAULT_TEXT_ALIGNS.text
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
  // TextElement.fontSize is required, unlike sticky/shape's optional field —
  // no default to fall back to, or a fall back to hide.
  if (element.type === 'text') return element.fontSize
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
