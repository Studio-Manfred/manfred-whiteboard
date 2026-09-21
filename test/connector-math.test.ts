import { describe, it, expect } from 'vitest'
import {
  getAnchorPosition,
  calculateBezierPath,
} from '../src/lib/connector-math'
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
})
