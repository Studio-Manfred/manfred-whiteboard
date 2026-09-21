/**
 * Keyboard operation of the canvas viewport (WCAG 2.1.1).
 *
 * Pan/zoom must not be pointer-only, so the focused canvas region maps arrow
 * keys to panning and +/-/0 to zooming. Kept as a pure function of
 * (viewport, key) so it can be tested without rendering the canvas.
 */

import { zoomAtPoint, type Point, type Viewport } from './coordinates'

/** Screen pixels moved per arrow key press. */
export const PAN_STEP = 50
/** Screen pixels moved per arrow key press while Shift is held. */
export const PAN_STEP_LARGE = 200
/** Multiplicative zoom applied per +/- press. */
export const ZOOM_STEP = 1.2

export interface KeyboardViewportOptions {
  /** Screen-space point to zoom around — normally the centre of the canvas. */
  focalPoint: Point
  /** Shift takes a larger pan step. */
  shiftKey?: boolean
}

/**
 * Returns the viewport produced by a key press, or `null` when the key is not
 * a viewport command (so the caller can leave the event alone).
 */
export function viewportFromKey(
  viewport: Viewport,
  key: string,
  { focalPoint, shiftKey = false }: KeyboardViewportOptions
): Viewport | null {
  // Panning works in screen pixels, so the canvas moves the same visual
  // distance regardless of the current zoom level.
  const step = shiftKey ? PAN_STEP_LARGE : PAN_STEP

  switch (key) {
    case 'ArrowLeft':
      return { ...viewport, x: viewport.x + step }
    case 'ArrowRight':
      return { ...viewport, x: viewport.x - step }
    case 'ArrowUp':
      return { ...viewport, y: viewport.y + step }
    case 'ArrowDown':
      return { ...viewport, y: viewport.y - step }
    case '+':
    case '=':
      return zoomAtPoint(viewport, focalPoint, viewport.zoom * ZOOM_STEP)
    case '-':
    case '_':
      return zoomAtPoint(viewport, focalPoint, viewport.zoom / ZOOM_STEP)
    case '0':
      return zoomAtPoint(viewport, focalPoint, 1)
    default:
      return null
  }
}
