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
import { arrowheadsOf, fontFamilyStack } from './element-style'
import type { Rect } from './marquee'
import type {
  BoardElement,
  ConnectorElement,
  DrawingElement,
  ShapeElement,
  StickyElement,
} from '../types/whiteboard'

/** Breathing room around the outermost elements. */
export const EXPORT_PADDING = 40
const EMPTY_BOARD = { width: 640, height: 480 }
const STICKY_TEXT_PADDING = 16
const LINE_HEIGHT = 1.35
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

function stickySvg(el: StickyElement): string {
  const fontSize = el.fontSize || 16
  const lines = el.text ? wrapText(el.text, el.width - STICKY_TEXT_PADDING * 2, fontSize) : []
  const lineHeight = fontSize * LINE_HEIGHT

  const tspans = lines
    .map((line, i) => {
      const y = el.y + STICKY_TEXT_PADDING + fontSize + i * lineHeight
      return `<tspan x="${el.x + STICKY_TEXT_PADDING}" y="${y}">${escapeXml(line)}</tspan>`
    })
    .join('')

  return (
    `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="8" ` +
    `fill="${el.color}" />` +
    (tspans
      ? `<text font-family="${escapeXml(fontFamilyStack(el.fontFamily))}" ` +
        `font-size="${fontSize}" fill="#1e293b">${tspans}</text>`
      : '')
  )
}

function shapeSvg(el: ShapeElement): string {
  const fill = el.fillColor || 'transparent'
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

/** A shape's centred label, if it has one. */
function shapeLabelSvg(el: ShapeElement): string {
  if (!el.text) return ''

  const fontSize = el.fontSize || 14
  return (
    `<text x="${el.x + el.width / 2}" y="${el.y + el.height / 2 + fontSize / 3}" ` +
    `text-anchor="middle" font-family="${escapeXml(fontFamilyStack(el.fontFamily))}" ` +
    `font-size="${fontSize}" fill="#1e293b">${escapeXml(el.text)}</text>`
  )
}

function drawingSvg(el: DrawingElement): string {
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
    default:
      return ''
  }
}

/** Only emitted when something actually points, to keep the file tidy. */
const ARROWHEAD_DEFS =
  '<defs>' +
  '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" ' +
  'orient="auto" markerUnits="strokeWidth"><polygon points="0 0, 10 3.5, 0 7" ' +
  'fill="#475569" /></marker>' +
  '<marker id="arrowhead-start" markerWidth="10" markerHeight="7" refX="0" refY="3.5" ' +
  'orient="auto" markerUnits="strokeWidth"><polygon points="10 0, 0 3.5, 10 7" ' +
  'fill="#475569" /></marker>' +
  '</defs>'

/** Back-to-front, so the export stacks the way the board does. */
function inZOrder(elements: ReadonlyMap<string, BoardElement>): BoardElement[] {
  return Array.from(elements.values()).sort((a, b) => a.zIndex - b.zIndex)
}

/** The whole board as a standalone SVG document. */
export function boardToSvg(elements: ReadonlyMap<string, BoardElement>): string {
  const bounds = boardBounds(elements)
  const drawn = inZOrder(elements).map((el) => elementSvg(el, elements)).filter(Boolean)
  const body = drawn.join('\n  ')
  const needsArrowhead = drawn.some((markup) => markup.includes('marker-'))

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" ` +
    `viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">\n` +
    (needsArrowhead ? `  ${ARROWHEAD_DEFS}\n` : '') +
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
