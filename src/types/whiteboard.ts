import * as Y from 'yjs'

export type ElementType = 'sticky' | 'shape' | 'frame' | 'connector' | 'drawing'
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

export interface StickyElement extends BaseElement {
  type: 'sticky'
  text: string
  color: string
  fontSize: number
  fontFamily?: FontFamily
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
}

export interface FrameElement extends BaseElement {
  type: 'frame'
  title: string
  fillColor: string
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
  points: Array<{ x: number; y: number }>
  strokeColor: string
  strokeWidth: number
}

export type BoardElement =
  | StickyElement
  | ShapeElement
  | FrameElement
  | ConnectorElement
  | DrawingElement

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
