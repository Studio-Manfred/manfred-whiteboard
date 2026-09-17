import { describe, it, expect } from 'vitest'
import {
  screenToWorld,
  worldToScreen,
  zoomAtPoint,
  clampZoom,
  MIN_ZOOM,
  MAX_ZOOM,
  type Point,
  type Viewport
} from '../src/lib/coordinates'

describe('Coordinate Math & Viewport Engine', () => {
  const defaultViewport: Viewport = { x: 0, y: 0, zoom: 1 }

  describe('screenToWorld', () => {
    it('returns exact point when viewport is at origin with 1.0x zoom', () => {
      const screen: Point = { x: 100, y: 200 }
      expect(screenToWorld(screen, defaultViewport)).toEqual({ x: 100, y: 200 })
    })

    it('accounts for pan offset', () => {
      const screen: Point = { x: 100, y: 200 }
      const viewport: Viewport = { x: 50, y: -50, zoom: 1 }
      expect(screenToWorld(screen, viewport)).toEqual({ x: 50, y: 250 })
    })

    it('accounts for zoom scaling', () => {
      const screen: Point = { x: 200, y: 400 }
      const viewport: Viewport = { x: 0, y: 0, zoom: 2 }
      expect(screenToWorld(screen, viewport)).toEqual({ x: 100, y: 200 })
    })

    it('accounts for combined pan and zoom', () => {
      const screen: Point = { x: 250, y: 350 }
      const viewport: Viewport = { x: 50, y: 50, zoom: 2 }
      // (250 - 50) / 2 = 100, (350 - 50) / 2 = 150
      expect(screenToWorld(screen, viewport)).toEqual({ x: 100, y: 150 })
    })
  })

  describe('worldToScreen', () => {
    it('maps world point back to original screen point', () => {
      const world: Point = { x: 100, y: 150 }
      const viewport: Viewport = { x: 50, y: 50, zoom: 2 }
      expect(worldToScreen(world, viewport)).toEqual({ x: 250, y: 350 })
    })

    it('is an exact inverse of screenToWorld', () => {
      const viewport: Viewport = { x: -120, y: 340, zoom: 1.75 }
      const originalScreen: Point = { x: 480, y: 620 }
      const world = screenToWorld(originalScreen, viewport)
      const convertedScreen = worldToScreen(world, viewport)
      expect(convertedScreen.x).toBeCloseTo(originalScreen.x, 5)
      expect(convertedScreen.y).toBeCloseTo(originalScreen.y, 5)
    })
  })

  describe('clampZoom', () => {
    it('keeps zoom within MIN_ZOOM and MAX_ZOOM', () => {
      expect(clampZoom(0.01)).toBe(MIN_ZOOM)
      expect(clampZoom(10)).toBe(MAX_ZOOM)
      expect(clampZoom(1.5)).toBe(1.5)
    })
  })

  describe('zoomAtPoint', () => {
    it('keeps the world point under the focal cursor invariant after zoom', () => {
      const viewport: Viewport = { x: 100, y: 100, zoom: 1 }
      const focalScreen: Point = { x: 300, y: 300 }

      // World point under cursor before zoom:
      const worldBefore = screenToWorld(focalScreen, viewport)

      // Zoom in by factor of 1.5
      const newViewport = zoomAtPoint(viewport, focalScreen, 1.5)

      // World point under cursor after zoom must be identical
      const worldAfter = screenToWorld(focalScreen, newViewport)

      expect(worldAfter.x).toBeCloseTo(worldBefore.x, 5)
      expect(worldAfter.y).toBeCloseTo(worldBefore.y, 5)
      expect(newViewport.zoom).toBe(1.5)
    })

    it('does not exceed max zoom when zooming in past boundary', () => {
      const viewport: Viewport = { x: 0, y: 0, zoom: 4.8 }
      const focalScreen: Point = { x: 200, y: 200 }
      const newViewport = zoomAtPoint(viewport, focalScreen, 6.0)
      expect(newViewport.zoom).toBe(MAX_ZOOM)
    })
  })
})
