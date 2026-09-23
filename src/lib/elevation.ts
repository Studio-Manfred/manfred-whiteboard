/**
 * How far an object sits off the board.
 *
 * Shared so notes and shapes behave identically. They are drawn differently,
 * though: a note is an opaque rounded card and takes a box shadow, while a
 * shape is often transparent and may be a circle, so it takes a drop-shadow
 * filter that follows its real outline.
 */

export const ELEVATIONS = ['resting', 'selected', 'dragging'] as const
export type Elevation = (typeof ELEVATIONS)[number]

export interface ElevationState {
  isSelected: boolean
  isDragging: boolean
}

/** Being moved outranks being selected — picking something up should show. */
export function elevationFor({ isSelected, isDragging }: ElevationState): Elevation {
  if (isDragging) return 'dragging'
  return isSelected ? 'selected' : 'resting'
}

const BOX_SHADOWS: Record<Elevation, string> = {
  resting: 'shadow-md hover:shadow-lg',
  selected: 'shadow-xl',
  dragging: 'shadow-2xl',
}

const DROP_SHADOWS: Record<Elevation, string> = {
  resting: 'drop-shadow(0 2px 4px rgba(15, 23, 42, 0.12))',
  selected: 'drop-shadow(0 8px 12px rgba(15, 23, 42, 0.18))',
  dragging: 'drop-shadow(0 14px 20px rgba(15, 23, 42, 0.22))',
}

/** For opaque, rectangular elements — sticky notes. */
export function boxShadowClass(elevation: Elevation): string {
  return BOX_SHADOWS[elevation]
}

/** For shapes, whose outline the shadow has to follow. */
export function dropShadowFilter(elevation: Elevation): string {
  return DROP_SHADOWS[elevation]
}
