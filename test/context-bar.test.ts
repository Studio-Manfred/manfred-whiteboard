import { describe, it, expect } from 'vitest'
import {
  selectionBounds,
  contextBarPosition,
  BAR_GAP,
  PANEL_ALLOWANCE,
  VIEWPORT_MARGIN,
} from '../src/lib/context-bar'
import type { BoardElement } from '../src/types/whiteboard'
import type { Viewport } from '../src/lib/coordinates'

function note(id: string, x: number, y: number): BoardElement {
  return {
    id, type: 'sticky', x, y, width: 200, height: 200, zIndex: 1,
    text: '', color: '#FFF9B1', fontSize: 16, createdAt: 0, updatedAt: 0,
  }
}

function arrow(id: string, fromId: string, toId: string): BoardElement {
  return {
    id, type: 'connector', fromId, toId, fromAnchor: 'right', toAnchor: 'left',
    x: 0, y: 0, width: 0, height: 0, zIndex: 1, strokeColor: '#475569',
    strokeWidth: 2, style: 'curved', createdAt: 0, updatedAt: 0,
  }
}

const board = new Map<string, BoardElement>([
  ['a', note('a', 0, 0)],
  ['b', note('b', 400, 300)],
  ['c', arrow('c', 'a', 'b')],
])

describe('selectionBounds', () => {
  it('is the element itself for one element', () => {
    expect(selectionBounds([board.get('a')!], board)).toEqual({
      x: 0, y: 0, width: 200, height: 200,
    })
  })

  it('wraps everything in a multi-selection', () => {
    expect(selectionBounds([board.get('a')!, board.get('b')!], board)).toEqual({
      x: 0, y: 0, width: 600, height: 500,
    })
  })

  it('derives an arrow\'s bounds from the elements it joins', () => {
    // a's right anchor (200,100) to b's left anchor (400,400).
    expect(selectionBounds([board.get('c')!], board)).toEqual({
      x: 200, y: 100, width: 200, height: 300,
    })
  })

  it('skips an arrow whose endpoints are gone', () => {
    const orphan = new Map<string, BoardElement>([['c', arrow('c', 'gone', 'also-gone')]])

    expect(selectionBounds([orphan.get('c')!], orphan)).toBeNull()
  })

  it('has no bounds for an empty selection', () => {
    expect(selectionBounds([], board)).toBeNull()
  })
})

describe('contextBarPosition', () => {
  const viewport: Viewport = { x: 0, y: 0, zoom: 1 }
  const bar = { width: 300, height: 44 }
  const screen = { width: 1200, height: 800 }

  it('centres the bar over the selection and sits above it', () => {
    const at = contextBarPosition({ x: 400, y: 300, width: 200, height: 200 }, viewport, bar, screen)

    expect(at.placement).toBe('above')
    expect(at.x).toBe(500 - bar.width / 2)
    expect(at.y).toBe(300 - bar.height - BAR_GAP)
  })

  it('flips below when the selection is near the top of the screen', () => {
    const at = contextBarPosition({ x: 400, y: 10, width: 200, height: 200 }, viewport, bar, screen)

    expect(at.placement).toBe('below')
    expect(at.y).toBe(10 + 200 + BAR_GAP)
  })

  it('flips below when there is no room for a panel above the bar', () => {
    // There is room for the bar itself here, but not for a panel above it.
    const at = contextBarPosition(
      { x: 400, y: VIEWPORT_MARGIN + PANEL_ALLOWANCE, width: 200, height: 200 },
      viewport,
      bar,
      screen
    )

    expect(at.placement).toBe('below')
  })

  it('keeps the bar on screen at the left edge', () => {
    const at = contextBarPosition({ x: -180, y: 300, width: 200, height: 200 }, viewport, bar, screen)

    expect(at.x).toBe(VIEWPORT_MARGIN)
  })

  it('keeps the bar on screen at the right edge', () => {
    const at = contextBarPosition({ x: 1150, y: 300, width: 200, height: 200 }, viewport, bar, screen)

    expect(at.x).toBe(screen.width - bar.width - VIEWPORT_MARGIN)
  })

  it('follows the viewport, so it stays over the selection when panned', () => {
    const panned: Viewport = { x: -100, y: -50, zoom: 1 }
    const at = contextBarPosition({ x: 400, y: 300, width: 200, height: 200 }, panned, bar, screen)

    expect(at.x).toBe(400 - 100 + 100 - bar.width / 2)
    expect(at.y).toBe(300 - 50 - bar.height - BAR_GAP)
  })

  it('tracks zoom, since the selection grows on screen but the bar does not', () => {
    const zoomed: Viewport = { x: 0, y: 0, zoom: 2 }
    const at = contextBarPosition({ x: 100, y: 200, width: 200, height: 200 }, zoomed, bar, screen)

    // The box occupies 200..600 across and starts at 400 down on screen.
    expect(at.x).toBe(400 - bar.width / 2)
    expect(at.y).toBe(400 - bar.height - BAR_GAP)
  })

  it('never returns a position for a selection with no bounds', () => {
    expect(contextBarPosition(null, viewport, bar, screen)).toBeNull()
  })
})
