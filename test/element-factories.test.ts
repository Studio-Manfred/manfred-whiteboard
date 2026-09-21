import { describe, it, expect } from 'vitest'
import {
  createStickyElement,
  createShapeElement,
  createDrawingElement,
  createConnectorElement,
  strokeBounds,
  STICKY_SIZE,
  SHAPE_SIZE,
} from '../src/lib/element-factories'
import { PASTEL_COLORS } from '../src/types/whiteboard'

const opts = { zIndex: 3, id: 'fixed-id', now: 1_700_000_000_000 }

describe('createStickyElement', () => {
  it('centres the note on the pointer', () => {
    const sticky = createStickyElement({ x: 500, y: 400 }, opts)

    expect(sticky.x).toBe(500 - STICKY_SIZE / 2)
    expect(sticky.y).toBe(400 - STICKY_SIZE / 2)
    expect(sticky.width).toBe(STICKY_SIZE)
    expect(sticky.height).toBe(STICKY_SIZE)
  })

  it('starts empty, on the given z-index, with both timestamps set', () => {
    const sticky = createStickyElement({ x: 0, y: 0 }, opts)

    expect(sticky).toMatchObject({
      id: 'fixed-id',
      type: 'sticky',
      text: '',
      zIndex: 3,
      fontSize: 16,
      createdAt: opts.now,
      updatedAt: opts.now,
    })
  })

  it('picks a colour from the pastel palette', () => {
    const sticky = createStickyElement({ x: 0, y: 0 }, opts)
    expect(PASTEL_COLORS).toContain(sticky.color)
  })

  it('honours an explicit colour', () => {
    const sticky = createStickyElement({ x: 0, y: 0 }, { ...opts, color: '#FFD1DC' })
    expect(sticky.color).toBe('#FFD1DC')
  })
})

describe('createShapeElement', () => {
  it('centres the shape on the pointer', () => {
    const shape = createShapeElement({ x: 200, y: 150 }, 'rectangle', opts)

    expect(shape.x).toBe(200 - SHAPE_SIZE.width / 2)
    expect(shape.y).toBe(150 - SHAPE_SIZE.height / 2)
    expect(shape.width).toBe(SHAPE_SIZE.width)
    expect(shape.height).toBe(SHAPE_SIZE.height)
  })

  it('carries the requested shape kind', () => {
    expect(createShapeElement({ x: 0, y: 0 }, 'circle', opts).shapeType).toBe('circle')
    expect(createShapeElement({ x: 0, y: 0 }, 'rectangle', opts).shapeType).toBe('rectangle')
  })

  it('is transparent with a visible stroke', () => {
    const shape = createShapeElement({ x: 0, y: 0 }, 'rectangle', opts)
    expect(shape.fillColor).toBe('transparent')
    expect(shape.strokeWidth).toBeGreaterThan(0)
  })
})

describe('strokeBounds', () => {
  it('returns the bounding box of the points', () => {
    expect(
      strokeBounds([
        { x: 10, y: 50 },
        { x: 30, y: 20 },
        { x: 5, y: 35 },
      ])
    ).toEqual({ x: 5, y: 20, width: 25, height: 30 })
  })

  it('never returns a zero-size box (a straight line stays hittable)', () => {
    expect(
      strokeBounds([
        { x: 10, y: 10 },
        { x: 40, y: 10 },
      ])
    ).toMatchObject({ height: 1 })
  })

  it('returns an empty box for no points', () => {
    expect(strokeBounds([])).toEqual({ x: 0, y: 0, width: 1, height: 1 })
  })
})

describe('createDrawingElement', () => {
  const points = [
    { x: 10, y: 10 },
    { x: 20, y: 30 },
    { x: 15, y: 40 },
  ]

  it('sizes itself to the stroke bounds and keeps the points', () => {
    const drawing = createDrawingElement(points, opts)

    expect(drawing).toMatchObject({ type: 'drawing', x: 10, y: 10, width: 10, height: 30 })
    expect(drawing.points).toEqual(points)
  })

  it('copies the points so later edits cannot mutate the element', () => {
    const source = [...points]
    const drawing = createDrawingElement(source, opts)
    source.push({ x: 999, y: 999 })

    expect(drawing.points).toHaveLength(3)
  })
})

describe('createConnectorElement', () => {
  it('records both endpoints and anchors', () => {
    const connector = createConnectorElement(
      { fromId: 'a', fromAnchor: 'right', toId: 'b', toAnchor: 'left' },
      opts
    )

    expect(connector).toMatchObject({
      type: 'connector',
      fromId: 'a',
      toId: 'b',
      fromAnchor: 'right',
      toAnchor: 'left',
      style: 'curved',
    })
  })

  it('has no geometry of its own — it is derived from its endpoints', () => {
    const connector = createConnectorElement(
      { fromId: 'a', fromAnchor: 'top', toId: 'b', toAnchor: 'bottom' },
      opts
    )

    expect(connector).toMatchObject({ x: 0, y: 0, width: 0, height: 0 })
  })
})
