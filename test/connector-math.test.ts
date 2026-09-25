import { describe, it, expect } from 'vitest'
import {
  getAnchorPosition,
  calculateBezierPath,
} from '../src/lib/connector-math'
import { estimateMeasure, layoutText, LINE_HEIGHT } from '../src/lib/text-layout'
import type { BaseElement } from '../src/types/whiteboard'

describe('Connector Anchor Geometry Engine', () => {
  const sampleElement: BaseElement = {
    id: 'elem-1',
    type: 'sticky',
    x: 100,
    y: 200,
    width: 200,
    height: 100,
    zIndex: 1,
    createdAt: 0,
    updatedAt: 0
  }

  describe('getAnchorPosition', () => {
    it('calculates top anchor at center of top edge', () => {
      const anchor = getAnchorPosition(sampleElement, 'top')
      expect(anchor).toEqual({ x: 200, y: 200 })
    })

    it('calculates right anchor at center of right edge', () => {
      const anchor = getAnchorPosition(sampleElement, 'right')
      expect(anchor).toEqual({ x: 300, y: 250 })
    })

    it('calculates bottom anchor at center of bottom edge', () => {
      const anchor = getAnchorPosition(sampleElement, 'bottom')
      expect(anchor).toEqual({ x: 200, y: 300 })
    })

    it('calculates left anchor at center of left edge', () => {
      const anchor = getAnchorPosition(sampleElement, 'left')
      expect(anchor).toEqual({ x: 100, y: 250 })
    })
  })

  describe('calculateBezierPath', () => {
    it('generates a valid SVG cubic bezier path string (M ... C ...)', () => {
      const start = { x: 100, y: 100 }
      const end = { x: 400, y: 100 }
      const { pathData, angle } = calculateBezierPath(start, end, 'right', 'left')

      expect(pathData).toMatch(/^M\s*100\s*100\s*C/)
      expect(pathData).toContain('400 100')
      expect(typeof angle).toBe('number')
    })

    it('computes control points that curve naturally between perpendicular anchors', () => {
      const start = { x: 200, y: 200 } // bottom anchor
      const end = { x: 400, y: 400 } // left anchor
      const { pathData } = calculateBezierPath(start, end, 'bottom', 'left')

      expect(pathData).toContain('M 200 200 C')
    })
  })

  // STU-972. Every other connectable element's height is a number the user
  // set; a text object's is derived from its content and written back when the
  // text reflows (see TextItem's drawnHeight). That is the one genuinely new
  // thing about text as an arrow endpoint, so the claim is tested directly:
  // a reflow alone, with no other change, must move the anchors.
  describe('anchors on a text object, whose height follows its content', () => {
    const measure = estimateMeasure()
    const font = { fontSize: 20 }
    const WIDTH = 240
    const ONE_LINE = 'hello'
    const MANY_LINES = 'hello world '.repeat(8)

    /** What TextItem stores back as `height` for this content. */
    const derivedHeight = (content: string) =>
      Math.max(layoutText(content, WIDTH, font, measure).height, font.fontSize * LINE_HEIGHT)

    const textElement = (content: string): BaseElement => ({
      id: 'text-1',
      type: 'text',
      x: 100,
      y: 200,
      width: WIDTH,
      height: derivedHeight(content),
      zIndex: 1,
      createdAt: 0,
      updatedAt: 0,
    })

    it('lays the two fixtures out to different heights', () => {
      // Guards the fixtures themselves: if both wrapped to the same number of
      // lines the tests below would pass while proving nothing at all.
      expect(layoutText(MANY_LINES, WIDTH, font, measure).lines.length).toBeGreaterThan(
        layoutText(ONE_LINE, WIDTH, font, measure).lines.length
      )
      expect(derivedHeight(MANY_LINES)).toBeGreaterThan(derivedHeight(ONE_LINE))
    })

    it('drops the bottom anchor by exactly the height the reflow added', () => {
      const before = textElement(ONE_LINE)
      const after = textElement(MANY_LINES)
      const grewBy = after.height - before.height

      expect(grewBy).toBeGreaterThan(0)
      expect(getAnchorPosition(after, 'bottom').y - getAnchorPosition(before, 'bottom').y)
        .toBeCloseTo(grewBy)
      // Horizontally unmoved: only the height changed.
      expect(getAnchorPosition(after, 'bottom').x).toBe(getAnchorPosition(before, 'bottom').x)
    })

    it('drops the side anchors by half of it', () => {
      const before = textElement(ONE_LINE)
      const after = textElement(MANY_LINES)
      const grewBy = after.height - before.height

      for (const side of ['left', 'right'] as const) {
        expect(getAnchorPosition(after, side).y - getAnchorPosition(before, side).y)
          .toBeCloseTo(grewBy / 2)
        expect(getAnchorPosition(after, side).x).toBe(getAnchorPosition(before, side).x)
      }
    })

    it('leaves the top anchor where it was, since the box grows downward', () => {
      expect(getAnchorPosition(textElement(MANY_LINES), 'top')).toEqual(
        getAnchorPosition(textElement(ONE_LINE), 'top')
      )
    })

    it('still gives an empty text object a real box to anchor to', () => {
      // A text object with no content still draws a clickable line-high box,
      // so its anchors must not collapse onto one point.
      const empty = textElement('')

      expect(empty.height).toBeCloseTo(font.fontSize * LINE_HEIGHT)
      expect(getAnchorPosition(empty, 'bottom').y).toBeGreaterThan(
        getAnchorPosition(empty, 'top').y
      )
    })
  })
})
