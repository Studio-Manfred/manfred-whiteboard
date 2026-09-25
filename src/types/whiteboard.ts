import * as Y from 'yjs'
import type { FillPattern } from '../lib/fill-patterns'

export type ElementType = 'sticky' | 'shape' | 'frame' | 'connector' | 'drawing' | 'text'
export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left'
export type ShapeKind = 'rectangle' | 'circle'

export interface BaseElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex: number
  createdAt: number
  updatedAt: number
}

/** Families that need no webfont download. */
export type FontFamily = 'sans' | 'serif' | 'mono'

export type TextAlign = 'left' | 'center' | 'right'

export interface StickyElement extends BaseElement {
  type: 'sticky'
  text: string
  color: string
  fontSize: number
  fontFamily?: FontFamily
  textAlign?: TextAlign
  /** Undefined renders as slate-800, which is what every label does today. */
  textColor?: string
}

export interface ShapeElement extends BaseElement {
  type: 'shape'
  shapeType: ShapeKind
  fillColor: string
  strokeColor: string
  strokeWidth: number
  text?: string
  fontSize?: number
  fontFamily?: FontFamily
  textAlign?: TextAlign
  /** Undefined means a solid fill, so every shape drawn before patterns
   * existed renders byte for byte as it did. */
  pattern?: FillPattern
  /** Undefined renders as slate-800, which is what every label does today. */
  textColor?: string
}

export interface FrameElement extends BaseElement {
  type: 'frame'
  title: string
  fillColor: string
}

/**
 * Bare text on the board. `width` is set by the user; `height` is derived from
 * the layout and written back by whichever client is editing, so that every
 * consumer of `.height` keeps working without knowing text can reflow.
 */
export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  fontSize: number
  fontFamily?: FontFamily
  textAlign?: TextAlign
  /** Undefined renders as slate-800, which is what every label does today. */
  textColor?: string
}

export interface ConnectorElement extends BaseElement {
  type: 'connector'
  fromId: string
  toId: string
  fromAnchor: AnchorPosition
  toAnchor: AnchorPosition
  strokeColor: string
  strokeWidth: number
  style: 'curved' | 'straight'
  /**
   * Arrowheads. Undefined means a head at the end only, which is how every
   * connector drawn before these fields existed behaves.
   */
  startArrow?: boolean
  endArrow?: boolean
}

export interface DrawingElement extends BaseElement {
  type: 'drawing'
  /** `p` is stylus pressure, present only when the device reported one. */
  points: Array<{ x: number; y: number; p?: number }>
  strokeColor: string
  strokeWidth: number
  /**
   * Which engine drew this stroke. Undefined means the original uniform-width
   * line, so strokes made before the pen existed are left exactly as they were.
   */
  ink?: 'pen'
}

export type BoardElement =
  | StickyElement
  | ShapeElement
  | FrameElement
  | ConnectorElement
  | DrawingElement
  | TextElement

export interface UserAwareness {
  user: {
    id: string
    name: string
    color: string
  }
  cursor: { x: number; y: number } | null
  selection: string[]
}

export interface WhiteboardDocState {
  doc: Y.Doc
  elementsMap: Y.Map<BoardElement>
  elementOrder: Y.Array<string>
}

/**
 * Initializes a standard Whiteboard Y.Doc with elements map and z-index ordering array.
 */
export function createWhiteboardDoc(doc = new Y.Doc()): WhiteboardDocState {
  const elementsMap = doc.getMap<BoardElement>('elements')
  const elementOrder = doc.getArray<string>('elementOrder')
  return { doc, elementsMap, elementOrder }
}

export const PASTEL_COLORS = [
  '#FFF9B1', // Sunbeam Yellow
  '#D4F0F0', // Mint Frost
  '#FFD1DC', // Coral Pink
  '#CCE2FF', // Sky Blue
  '#E8D7FF', // Lavender
  '#FFE5D4', // Peach Cream
] as const
