/**
 * Pure constructors for board elements.
 *
 * Kept out of App so element shape and default geometry can be tested without
 * a canvas. `id` and `now` are injectable so tests are deterministic.
 */

import type { Point } from './coordinates'
import type { InkPoint } from './ink'
import {
  PASTEL_COLORS,
  type AnchorPosition,
  type ConnectorElement,
  type DrawingElement,
  type ShapeElement,
  type ShapeKind,
  type StickyElement,
  type TextElement,
} from '../types/whiteboard'

/** Sticky notes are square; shapes default to a landscape box. */
export const STICKY_SIZE = 200
export const SHAPE_SIZE = { width: 120, height: 100 } as const
export const TEXT_DEFAULT_WIDTH = 240

const DEFAULT_STROKE = '#0f172a'
const CONNECTOR_STROKE = '#475569'

export interface FactoryOptions {
  /** Stacking order for the new element — normally `elements.size + 1`. */
  zIndex: number
  id?: string
  now?: number
}

interface StickyOptions extends FactoryOptions {
  color?: string
}

function base(options: FactoryOptions) {
  const now = options.now ?? Date.now()
  return {
    id: options.id ?? crypto.randomUUID(),
    zIndex: options.zIndex,
    createdAt: now,
    updatedAt: now,
  }
}

function randomPastel(): string {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]
}

/** A sticky note centred on the pointer. */
export function createStickyElement(at: Point, options: StickyOptions): StickyElement {
  return {
    ...base(options),
    type: 'sticky',
    x: at.x - STICKY_SIZE / 2,
    y: at.y - STICKY_SIZE / 2,
    width: STICKY_SIZE,
    height: STICKY_SIZE,
    text: '',
    color: options.color ?? randomPastel(),
    fontSize: 16,
  }
}

/** A rectangle or circle centred on the pointer. */
export function createShapeElement(
  at: Point,
  shapeType: ShapeKind,
  options: FactoryOptions
): ShapeElement {
  return {
    ...base(options),
    type: 'shape',
    shapeType,
    x: at.x - SHAPE_SIZE.width / 2,
    y: at.y - SHAPE_SIZE.height / 2,
    width: SHAPE_SIZE.width,
    height: SHAPE_SIZE.height,
    fillColor: 'transparent',
    strokeColor: DEFAULT_STROKE,
    strokeWidth: 2,
  }
}

/**
 * Bounding box of a freehand stroke. Width and height never fall to zero, so a
 * perfectly straight line still has an area to hit-test against.
 */
export function strokeBounds(points: readonly Point[]): {
  x: number
  y: number
  width: number
  height: number
} {
  if (points.length === 0) return { x: 0, y: 0, width: 1, height: 1 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }

  return { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 }
}

/** A committed freehand stroke, sized to its own bounds. */
export function createDrawingElement(
  points: readonly InkPoint[],
  options: FactoryOptions
): DrawingElement {
  return {
    ...base(options),
    ...strokeBounds(points),
    type: 'drawing',
    // Pressure is kept only where a device reported one.
    points: points.map((p) => ({ x: p.x, y: p.y, ...(p.p === undefined ? {} : { p: p.p }) })),
    strokeColor: DEFAULT_STROKE,
    strokeWidth: 3,
    ink: 'pen',
  }
}

export interface ConnectorEndpoints {
  fromId: string
  fromAnchor: AnchorPosition
  toId: string
  toAnchor: AnchorPosition
}

/**
 * A connector between two elements. It carries no geometry: the path is derived
 * from wherever its endpoints currently sit.
 */
export function createConnectorElement(
  endpoints: ConnectorEndpoints,
  options: FactoryOptions
): ConnectorElement {
  return {
    ...base(options),
    ...endpoints,
    type: 'connector',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    strokeColor: CONNECTOR_STROKE,
    strokeWidth: 2,
    style: 'curved',
  }
}

interface TextOptions extends FactoryOptions {
  width?: number
}

/** An empty text object centred on the pointer. Height is 0 until it has
 * words — the editing client writes the real one once it lays them out. */
export function createTextElement(at: Point, options: TextOptions): TextElement {
  const width = options.width ?? TEXT_DEFAULT_WIDTH

  return {
    ...base(options),
    type: 'text',
    x: at.x - width / 2,
    y: at.y,
    width,
    height: 0,
    text: '',
    fontSize: 16,
  }
}
