/** Single-key shortcuts for the canvas tools. Documented in the README. */

import type { CanvasTool } from '../components/Canvas/CanvasViewport'

export const TOOL_SHORTCUTS: Record<string, CanvasTool> = {
  v: 'select',
  h: 'pan',
  s: 'sticky',
  r: 'rectangle',
  c: 'circle',
  l: 'connector',
  p: 'pen',
  e: 'eraser',
}

/** The tool a key selects, or null when the key is not a tool shortcut. */
export function toolForShortcut(key: string): CanvasTool | null {
  return TOOL_SHORTCUTS[key.toLowerCase()] ?? null
}
