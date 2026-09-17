export interface Point {
  x: number
  y: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 5.0

/**
 * Clamps a zoom level between MIN_ZOOM and MAX_ZOOM.
 */
export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/**
 * Converts screen coordinates (mouse pixels in window) to world coordinates (infinite canvas space).
 */
export function screenToWorld(screenPoint: Point, viewport: Viewport): Point {
  return {
    x: (screenPoint.x - viewport.x) / viewport.zoom,
    y: (screenPoint.y - viewport.y) / viewport.zoom,
  }
}

/**
 * Converts world coordinates (infinite canvas space) to screen coordinates (pixels in window).
 */
export function worldToScreen(worldPoint: Point, viewport: Viewport): Point {
  return {
    x: worldPoint.x * viewport.zoom + viewport.x,
    y: worldPoint.y * viewport.zoom + viewport.y,
  }
}

/**
 * Computes a new viewport when zooming relative to a focal screen point (e.g. mouse cursor position).
 * Ensures the world point under the cursor remains unchanged before and after zoom.
 */
export function zoomAtPoint(
  currentViewport: Viewport,
  focalScreenPoint: Point,
  targetZoom: number
): Viewport {
  const clampedZoom = clampZoom(targetZoom)
  if (clampedZoom === currentViewport.zoom) {
    return currentViewport
  }

  // World point under cursor before zoom
  const worldUnderCursor = screenToWorld(focalScreenPoint, currentViewport)

  // Compute new viewport x and y so that:
  // focalScreenPoint.x = worldUnderCursor.x * clampedZoom + newX
  // => newX = focalScreenPoint.x - worldUnderCursor.x * clampedZoom
  const newX = focalScreenPoint.x - worldUnderCursor.x * clampedZoom
  const newY = focalScreenPoint.y - worldUnderCursor.y * clampedZoom

  return {
    x: newX,
    y: newY,
    zoom: clampedZoom,
  }
}
