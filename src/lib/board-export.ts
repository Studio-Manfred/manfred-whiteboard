/**
 * Turns a board into something you can take away: a standalone SVG (which the
 * PNG export rasterises) or a JSON backup.
 *
 * The canvas is DOM plus SVG layers rather than a `<canvas>`, so there is no
 * bitmap to grab — the board is redrawn here from the elements themselves.
 * Keeping that as a pure string function is also what makes it testable.
 */

import { getAnchorPosition, calculateBezierPath } from './connector-math'
import { pointsToSmoothPath } from './stroke-path'
import { isPenStroke, penOutlinePath } from './ink'
import { FILL_PATTERNS, patternFill, patternIdFor, patternTile } from './fill-patterns'
import {
  arrowheadsOf,
  effectiveTextAlign,
  fontFamilyStack,
  textPaddingFor,
} from './element-style'
import { canvasMeasure, layoutText, LINE_HEIGHT, type Measure } from './text-layout'
import type { Rect } from './marquee'
import type {
  TextAlign,
  BoardElement,
  ConnectorElement,
  DrawingElement,
  ShapeElement,
  StickyElement,
  TextElement,
} from '../types/whiteboard'

/** Breathing room around the outermost elements. */
export const EXPORT_PADDING = 40
const EMPTY_BOARD = { width: 640, height: 480 }
/** Rough average glyph width relative to font size — enough to wrap sensibly. */
const GLYPH_RATIO = 0.55

/** Connectors are drawn from their endpoints, so they contribute no bounds. */
function hasOwnGeometry(el: BoardElement): boolean {
  return el.type !== 'connector'
}

/** The area the board occupies, with padding. */
export function boardBounds(elements: ReadonlyMap<string, BoardElement>): Rect {
  const drawn = Array.from(elements.values()).filter(hasOwnGeometry)

  if (drawn.length === 0) {
    return { x: 0, y: 0, ...EMPTY_BOARD }
  }

  const minX = Math.min(...drawn.map((el) => el.x))
  const minY = Math.min(...drawn.map((el) => el.y))
  const maxX = Math.max(...drawn.map((el) => el.x + el.width))
  const maxY = Math.max(...drawn.map((el) => el.y + el.height))

  return {
    x: minX - EXPORT_PADDING,
    y: minY - EXPORT_PADDING,
    width: maxX - minX + EXPORT_PADDING * 2,
    height: maxY - minY + EXPORT_PADDING * 2,
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Wraps text to the available width. SVG has no flow layout, so every line has
 * to be measured and placed by hand; an average glyph width is close enough
 * for an export.
 */
function wrapText(text: string, width: number, fontSize: number): string[] {
  const maxChars = Math.max(1, Math.floor(width / (fontSize * GLYPH_RATIO)))

  return text.split('\n').flatMap((paragraph) => {
    if (paragraph.length === 0) return ['']

    const lines: string[] = []
    let line = ''

    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (candidate.length <= maxChars) {
        line = candidate
      } else {
        if (line) lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)

    return lines
  })
}

let exportMeasure: Measure | undefined

/** The export runs in the browser, so it measures with the same real metrics
 * the canvas does. Created on first use: calling getContext at import time
 * makes jsdom noisy for every file that imports this module. canvasMeasure
 * already handles its own fallback to estimateMeasure when there is no canvas. */
function measureForExport() {
  if (!exportMeasure) {
    exportMeasure = canvasMeasure()
  }
  return exportMeasure
}

/** SVG has no text alignment: the anchor and the x both have to move. */
function textAnchorFor(align: TextAlign): string {
  if (align === 'center') return 'middle'
  if (align === 'right') return 'end'
  return 'start'
}

function textXFor(align: TextAlign, left: number, width: number, padding: number): number {
  if (align === 'center') return left + width / 2
  if (align === 'right') return left + width - padding
  return left + padding
}

/** Bare words: no card, no border, one tspan per laid-out line. */
function textSvg(el: TextElement): string {
  const { lines } = layoutText(el.text, el.width, el, measureForExport())
  if (lines.length === 0) return ''

  const align = effectiveTextAlign(el) ?? 'left'
  const x = textXFor(align, el.x, el.width, 0)
  const lineHeight = el.fontSize * LINE_HEIGHT

  const tspans = lines
    .map((line, i) => `<tspan x="${x}" y="${el.y + el.fontSize + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join('')

  return (
    `<text font-family="${escapeXml(fontFamilyStack(el.fontFamily))}" ` +
    `font-size="${el.fontSize}" text-anchor="${textAnchorFor(align)}" ` +
    `fill="${escapeXml(el.textColor ?? '#1e293b')}">${tspans}</text>`
  )
}

function stickySvg(el: StickyElement): string {
  const fontSize = el.fontSize || 16
  const padding = textPaddingFor(el) ?? 0
  const lines = el.text ? wrapText(el.text, el.width - padding * 2, fontSize) : []
  const lineHeight = fontSize * LINE_HEIGHT

  const align = effectiveTextAlign(el) ?? 'left'
  const textX = textXFor(align, el.x, el.width, padding)

  const tspans = lines
    .map((line, i) => {
      const y = el.y + padding + fontSize + i * lineHeight
      return `<tspan x="${textX}" y="${y}">${escapeXml(line)}</tspan>`
    })
    .join('')

  return (
    `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="8" ` +
    `fill="${el.color}" />` +
    (tspans
      ? `<text font-family="${escapeXml(fontFamilyStack(el.fontFamily))}" ` +
        `font-size="${fontSize}" text-anchor="${textAnchorFor(align)}" ` +
        `fill="#1e293b">${tspans}</text>`
      : '')
  )
}

function shapeSvg(el: ShapeElement): string {
  const fill = patternFill(el)
  const stroke = el.strokeColor || '#0f172a'
  const strokeWidth = el.strokeWidth || 2

  if (el.shapeType === 'circle') {
    return (
      `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" ` +
      `rx="${el.width / 2}" ry="${el.height / 2}" ` +
      `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
    )
  }

  return (
    `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="8" ` +
    `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
  )
}

/** The `<pattern>` def a patterned shape's fill points at — the tile's
 * background in the shape's own fill colour, its ink in the shape's own
 * stroke colour, so the feature adds no new colour field. Nothing is emitted
 * for a shape with no pattern, or one this build does not recognise. */
function patternDefSvg(el: ShapeElement): string {
  if (!el.pattern || !FILL_PATTERNS.includes(el.pattern)) return ''

  const tile = patternTile(el.pattern)
  const background = el.fillColor || 'transparent'
  const ink = el.strokeColor || '#0f172a'

  const marks = tile.marks
    .map((mark) =>
      mark.kind === 'fill'
        ? `<path d="${mark.d}" fill="${ink}" />`
        : `<path d="${mark.d}" fill="none" stroke="${ink}" stroke-width="${tile.strokeWidth}" />`
    )
    .join('')

  // The canvas gives every shape its own `<svg>`, so its tile starts at the
  // shape's corner. Here every shape shares one board-wide viewBox, so the
  // tile has to be offset to that same corner or the exported pattern sits at
  // a different phase than the one on screen.
  return (
    `<pattern id="${patternIdFor(el.id)}" x="${el.x}" y="${el.y}" ` +
    `width="${tile.size}" height="${tile.size}" ` +
    `patternUnits="userSpaceOnUse">` +
    `<rect width="${tile.size}" height="${tile.size}" fill="${background}" />${marks}` +
    `</pattern>`
  )
}

/** A shape's centred label, if it has one. */
function shapeLabelSvg(el: ShapeElement): string {
  if (!el.text) return ''

  const fontSize = el.fontSize || 14
  const align = effectiveTextAlign(el) ?? 'center'
  const x = textXFor(align, el.x, el.width, textPaddingFor(el) ?? 0)

  // Dense ink swallows a label sitting straight on it. SVG haloes with
  // paint-order rather than the canvas's text-shadow, but to the same end and
  // in the same colour — the shape's own fill.
  const halo = patternFill(el).startsWith('url(')
    ? `paint-order="stroke" stroke="${el.fillColor}" stroke-width="3" stroke-linejoin="round" `
    : ''

  return (
    `<text x="${x}" y="${el.y + el.height / 2 + fontSize / 3}" ` +
    `text-anchor="${textAnchorFor(align)}" ${halo}` +
    `font-family="${escapeXml(fontFamilyStack(el.fontFamily))}" ` +
    `font-size="${fontSize}" fill="#1e293b">${escapeXml(el.text)}</text>`
  )
}

function drawingSvg(el: DrawingElement): string {
  // Pen ink varies in width, so it exports as a filled outline — the same
  // shape the canvas draws.
  if (isPenStroke(el)) {
    return `<path d="${penOutlinePath(el.points, el.strokeWidth)}" fill="${el.strokeColor}" />`
  }

  return (
    `<path d="${pointsToSmoothPath(el.points)}" fill="none" stroke="${el.strokeColor}" ` +
    `stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`
  )
}

function connectorSvg(
  el: ConnectorElement,
  elements: ReadonlyMap<string, BoardElement>
): string {
  const from = elements.get(el.fromId)
  const to = elements.get(el.toId)
  if (!from || !to) return ''

  const { pathData } = calculateBezierPath(
    getAnchorPosition(from, el.fromAnchor),
    getAnchorPosition(to, el.toAnchor),
    el.fromAnchor,
    el.toAnchor
  )

  const heads = arrowheadsOf(el)
  const markers =
    (heads === 'start' || heads === 'both' ? ' marker-start="url(#arrowhead-start)"' : '') +
    (heads === 'end' || heads === 'both' ? ' marker-end="url(#arrowhead)"' : '')

  return (
    `<path d="${pathData}" fill="none" stroke="${el.strokeColor || '#475569'}" ` +
    `stroke-width="${el.strokeWidth || 2}" stroke-linecap="round"${markers} />`
  )
}

function elementSvg(el: BoardElement, elements: ReadonlyMap<string, BoardElement>): string {
  switch (el.type) {
    case 'sticky':
      return stickySvg(el)
    case 'shape':
      return shapeSvg(el) + shapeLabelSvg(el)
    case 'drawing':
      return drawingSvg(el)
    case 'connector':
      return connectorSvg(el, elements)
    case 'text':
      return textSvg(el)
    default:
      return ''
  }
}

/** Only emitted when something actually points, to keep the file tidy. Shares
 * one `<defs>` block with any pattern defs — see `boardToSvg`. */
const ARROWHEAD_MARKERS =
  '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" ' +
  'orient="auto" markerUnits="strokeWidth"><polygon points="0 0, 10 3.5, 0 7" ' +
  'fill="#475569" /></marker>' +
  '<marker id="arrowhead-start" markerWidth="10" markerHeight="7" refX="0" refY="3.5" ' +
  'orient="auto" markerUnits="strokeWidth"><polygon points="10 0, 0 3.5, 10 7" ' +
  'fill="#475569" /></marker>'

/** Back-to-front, so the export stacks the way the board does. */
function inZOrder(elements: ReadonlyMap<string, BoardElement>): BoardElement[] {
  return Array.from(elements.values()).sort((a, b) => a.zIndex - b.zIndex)
}

/** The whole board as a standalone SVG document. */
export function boardToSvg(elements: ReadonlyMap<string, BoardElement>): string {
  const bounds = boardBounds(elements)
  const ordered = inZOrder(elements)
  const drawn = ordered.map((el) => elementSvg(el, elements)).filter(Boolean)
  const body = drawn.join('\n  ')
  const needsArrowhead = drawn.some((markup) => markup.includes('marker-'))

  const patternDefs = ordered
    .filter((el): el is ShapeElement => el.type === 'shape')
    .map(patternDefSvg)
    .join('')

  // One `<defs>` block total: arrowhead markers and pattern defs share it
  // rather than each emitting their own.
  const defsInner = (needsArrowhead ? ARROWHEAD_MARKERS : '') + patternDefs
  const defs = defsInner ? `  <defs>${defsInner}</defs>\n` : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" ` +
    `viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">\n` +
    defs +
    `  <rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="#f8fafc" />\n` +
    (body ? `  ${body}\n` : '') +
    `</svg>\n`
  )
}

export interface BoardBackup {
  version: number
  exportedAt: string
  elements: BoardElement[]
}

/** A JSON backup of the board, ordered so a reader can rebuild the stack. */
export function boardToJson(
  elements: ReadonlyMap<string, BoardElement>,
  now: Date = new Date()
): string {
  const backup: BoardBackup = {
    version: 1,
    exportedAt: now.toISOString(),
    elements: inZOrder(elements),
  }

  return JSON.stringify(backup, null, 2)
}
