/**
 * Resize geometry: a rect, the handle being dragged and a world-space delta in,
 * a new rect out.
 *
 * Pure on purpose — resizing is fiddly (which edge moves, which stays pinned,
 * what happens when you drag past the far side) and all of that is worth
 * testing without a canvas in the way.
 */

import { scalePoints } from './scale-points'
import type { Point } from './coordinates'
import type { Rect } from './marquee'
import type { BoardElement } from '../types/whiteboard'

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

/** Clockwise from the top-left, which is also a sensible tab order. */
export const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/**
 * Which handles an element offers. Text derives its height from its content,
 * so a vertical handle would be a control that looks live and does nothing.
 */
export function handlesFor(element: BoardElement): ResizeHandle[] {
  return element.type === 'text' ? ['e', 'w'] : RESIZE_HANDLES
}

/** An element can never be dragged smaller than this, or inverted. */
export const MIN_ELEMENT_SIZE = 40

export interface ResizeOptions {
  /** Corner drags only: keep the rect's current proportions. */
  preserveAspectRatio?: boolean
}

function movesWest(handle: ResizeHandle): boolean {
  return handle === 'nw' || handle === 'w' || handle === 'sw'
}

function movesEast(handle: ResizeHandle): boolean {
  return handle === 'ne' || handle === 'e' || handle === 'se'
}

function movesNorth(handle: ResizeHandle): boolean {
  return handle === 'nw' || handle === 'n' || handle === 'ne'
}

function movesSouth(handle: ResizeHandle): boolean {
  return handle === 'sw' || handle === 's' || handle === 'se'
}

function isCorner(handle: ResizeHandle): boolean {
  return handle.length === 2
}

/** Where the handle sits on the box, as a fraction of its width and height. */
export function handleAnchorPoint(handle: ResizeHandle): Point {
  const x = movesWest(handle) ? 0 : movesEast(handle) ? 1 : 0.5
  const y = movesNorth(handle) ? 0 : movesSouth(handle) ? 1 : 0.5

  return { x, y }
}

/** The cursor that matches the axis a handle moves along. */
export function cursorForHandle(handle: ResizeHandle): string {
  if (handle === 'n' || handle === 's') return 'ns-resize'
  if (handle === 'e' || handle === 'w') return 'ew-resize'
  if (handle === 'nw' || handle === 'se') return 'nwse-resize'
  return 'nesw-resize'
}

/**
 * The rect produced by dragging `handle` by `delta` from `rect`.
 *
 * The edges the handle does not control stay exactly where they are, so an
 * element never drifts while being resized, and a drag past the opposite edge
 * stops at the minimum size rather than turning the element inside out.
 */
export function resizeRect(
  rect: Rect,
  handle: ResizeHandle,
  delta: Point,
  { preserveAspectRatio = false }: ResizeOptions = {}
): Rect {
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height

  let { x, y, width, height } = rect

  if (movesEast(handle)) {
    width = Math.max(MIN_ELEMENT_SIZE, rect.width + delta.x)
  } else if (movesWest(handle)) {
    width = Math.max(MIN_ELEMENT_SIZE, rect.width - delta.x)
    x = right - width
  }

  if (movesSouth(handle)) {
    height = Math.max(MIN_ELEMENT_SIZE, rect.height + delta.y)
  } else if (movesNorth(handle)) {
    height = Math.max(MIN_ELEMENT_SIZE, rect.height - delta.y)
    y = bottom - height
  }

  if (preserveAspectRatio && isCorner(handle)) {
    const ratio = rect.width / rect.height
    // Let the larger change lead, so the drag follows the pointer.
    if (Math.abs(width - rect.width) >= Math.abs(height - rect.height)) {
      height = Math.max(MIN_ELEMENT_SIZE, width / ratio)
      width = height * ratio
    } else {
      width = Math.max(MIN_ELEMENT_SIZE, height * ratio)
      height = width / ratio
    }

    if (movesWest(handle)) x = right - width
    if (movesNorth(handle)) y = bottom - height
  }

  return { x, y, width, height }
}

/**
 * The patch that resizes an element to a new box.
 *
 * Ink has no body to stretch, so its points move with the box; everything else
 * only needs the box itself.
 */
export function resizePatchFor(element: BoardElement, next: Rect): Partial<BoardElement> {
  if (element.type !== 'drawing') return next as Partial<BoardElement>

  return {
    ...next,
    points: scalePoints(
      element.points,
      { x: element.x, y: element.y, width: element.width, height: element.height },
      next
    ),
  } as Partial<BoardElement>
}

