import { describe, it, expect } from 'vitest'
import {
  viewportFromKey,
  PAN_STEP,
  PAN_STEP_LARGE,
  ZOOM_STEP,
} from '../src/lib/keyboard-viewport'
import { MAX_ZOOM, MIN_ZOOM, type Viewport } from '../src/lib/coordinates'

const focalPoint = { x: 400, y: 300 }
const base: Viewport = { x: 0, y: 0, zoom: 1 }

describe('viewportFromKey', () => {
  it('returns null for keys it does not handle', () => {
    expect(viewportFromKey(base, 'a', { focalPoint })).toBeNull()
  })

  it('pans the camera right when ArrowRight is pressed', () => {
    // Camera moves right => world content translates left.
    expect(viewportFromKey(base, 'ArrowRight', { focalPoint })).toEqual({
      x: -PAN_STEP,
      y: 0,
      zoom: 1,
    })
  })

  it('pans the camera in each arrow direction', () => {
    expect(viewportFromKey(base, 'ArrowLeft', { focalPoint })?.x).toBe(PAN_STEP)
    expect(viewportFromKey(base, 'ArrowUp', { focalPoint })?.y).toBe(PAN_STEP)
    expect(viewportFromKey(base, 'ArrowDown', { focalPoint })?.y).toBe(-PAN_STEP)
  })

  it('takes a larger step when shift is held', () => {
    expect(
      viewportFromKey(base, 'ArrowRight', { focalPoint, shiftKey: true })?.x
    ).toBe(-PAN_STEP_LARGE)
  })

  it('scales the pan step with zoom so it moves a constant screen distance', () => {
    const zoomed: Viewport = { x: 0, y: 0, zoom: 2 }
    expect(viewportFromKey(zoomed, 'ArrowRight', { focalPoint })).toEqual({
      x: -PAN_STEP,
      y: 0,
      zoom: 2,
    })
  })

  it('zooms in around the focal point on + and =', () => {
    const zoomedIn = viewportFromKey(base, '+', { focalPoint })
    expect(zoomedIn?.zoom).toBeCloseTo(ZOOM_STEP)
    expect(viewportFromKey(base, '=', { focalPoint })?.zoom).toBeCloseTo(ZOOM_STEP)
  })

  it('keeps the focal point anchored while zooming', () => {
    const zoomedIn = viewportFromKey(base, '+', { focalPoint })!
    // The world point under the focal point must not move on screen.
    const worldX = (focalPoint.x - base.x) / base.zoom
    expect(worldX * zoomedIn.zoom + zoomedIn.x).toBeCloseTo(focalPoint.x)
  })

  it('zooms out on - and _', () => {
    expect(viewportFromKey(base, '-', { focalPoint })?.zoom).toBeCloseTo(1 / ZOOM_STEP)
    expect(viewportFromKey(base, '_', { focalPoint })?.zoom).toBeCloseTo(1 / ZOOM_STEP)
  })

  it('resets zoom to 100% on 0', () => {
    const zoomed: Viewport = { x: -120, y: 40, zoom: 3 }
    expect(viewportFromKey(zoomed, '0', { focalPoint })?.zoom).toBe(1)
  })

  it('respects the zoom clamp at both ends', () => {
    const maxed: Viewport = { x: 0, y: 0, zoom: MAX_ZOOM }
    expect(viewportFromKey(maxed, '+', { focalPoint })?.zoom).toBe(MAX_ZOOM)

    const minned: Viewport = { x: 0, y: 0, zoom: MIN_ZOOM }
    expect(viewportFromKey(minned, '-', { focalPoint })?.zoom).toBe(MIN_ZOOM)
  })
})
