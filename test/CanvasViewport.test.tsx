import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanvasViewport, type CanvasTool } from '../src/components/Canvas/CanvasViewport'
import { PAN_STEP, PAN_STEP_LARGE } from '../src/lib/keyboard-viewport'
import type { Viewport } from '../src/lib/coordinates'

const base: Viewport = { x: 0, y: 0, zoom: 1 }
const CANVAS = /Interactive canvas workspace/

function renderCanvas(
  overrides: {
    viewport?: Viewport
    activeTool?: CanvasTool
    children?: React.ReactNode
  } = {}
) {
  const handlers = {
    onViewportChange: vi.fn(),
    onCanvasPointerDown: vi.fn(),
    onCanvasPointerMove: vi.fn(),
    onCanvasPointerUp: vi.fn(),
  }
  const view = render(
    <CanvasViewport
      viewport={overrides.viewport ?? base}
      activeTool={overrides.activeTool ?? 'select'}
      {...handlers}
    >
      {overrides.children}
    </CanvasViewport>
  )
  return { handlers, region: screen.getByRole('region', { name: CANVAS }), ...view }
}

describe('CanvasViewport', () => {
  it('is a focusable region that names its own keyboard controls', () => {
    const { region } = renderCanvas()

    expect(region).toHaveAttribute('tabindex', '0')
    expect(region.getAttribute('aria-label')).toMatch(/arrow keys pan/i)
  })

  it('renders board content inside the transformed world container', () => {
    renderCanvas({ children: <div data-testid="child" /> })

    const world = document.getElementById('canvas-world')
    expect(world).toContainElement(screen.getByTestId('child'))
  })

  it('applies the viewport as a CSS transform on the world container', () => {
    renderCanvas({ viewport: { x: 40, y: -20, zoom: 1.5 } })

    expect(document.getElementById('canvas-world')).toHaveStyle({
      transform: 'translate(40px, -20px) scale(1.5)',
    })
  })

  it('reports pointer events in world coordinates, not screen coordinates', () => {
    const { handlers, region } = renderCanvas({ viewport: { x: 100, y: 50, zoom: 2 } })

    fireEvent.pointerDown(region, { clientX: 300, clientY: 150 })

    expect(handlers.onCanvasPointerDown).toHaveBeenCalledWith(
      { x: 100, y: 50 },
      expect.anything()
    )
  })

  it('passes move and up events through as well', () => {
    const { handlers, region } = renderCanvas()

    fireEvent.pointerMove(region, { clientX: 10, clientY: 20 })
    fireEvent.pointerUp(region, { clientX: 10, clientY: 20 })

    expect(handlers.onCanvasPointerMove).toHaveBeenCalledOnce()
    expect(handlers.onCanvasPointerUp).toHaveBeenCalledOnce()
  })

  it('pans instead of drawing while the pan tool is active', () => {
    const { handlers, region } = renderCanvas({ activeTool: 'pan' })

    fireEvent.pointerDown(region, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(region, { clientX: 130, clientY: 90 })

    expect(handlers.onCanvasPointerDown).not.toHaveBeenCalled()
    expect(handlers.onViewportChange).toHaveBeenCalledWith({ x: 30, y: -10, zoom: 1 })
  })

  it('pans on middle-click drag whatever the active tool', () => {
    const { handlers, region } = renderCanvas({ activeTool: 'sticky' })

    fireEvent.pointerDown(region, { button: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(region, { clientX: 25, clientY: 25 })

    expect(handlers.onCanvasPointerDown).not.toHaveBeenCalled()
    expect(handlers.onViewportChange).toHaveBeenCalledWith({ x: 25, y: 25, zoom: 1 })
  })

  it('pans while the spacebar is held', () => {
    const { handlers, region } = renderCanvas({ activeTool: 'sticky' })

    fireEvent.keyDown(window, { code: 'Space' })
    fireEvent.pointerDown(region, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(region, { clientX: 10, clientY: 0 })

    expect(handlers.onViewportChange).toHaveBeenCalledWith({ x: 10, y: 0, zoom: 1 })

    fireEvent.keyUp(window, { code: 'Space' })
  })

  it('stops panning on pointer up', () => {
    const { handlers, region } = renderCanvas({ activeTool: 'pan' })

    fireEvent.pointerDown(region, { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(region, { clientX: 0, clientY: 0 })
    handlers.onViewportChange.mockClear()
    fireEvent.pointerMove(region, { clientX: 80, clientY: 80 })

    expect(handlers.onViewportChange).not.toHaveBeenCalled()
    expect(handlers.onCanvasPointerUp).not.toHaveBeenCalled()
  })

  it('scrolls the canvas on a wheel pan gesture', () => {
    const { handlers, region } = renderCanvas()

    fireEvent.wheel(region, { deltaX: 30, deltaY: 60 })

    expect(handlers.onViewportChange).toHaveBeenCalledWith({ x: -30, y: -60, zoom: 1 })
  })

  it('zooms instead of scrolling when the wheel is pinched or ctrl-held', () => {
    const { handlers, region } = renderCanvas()

    fireEvent.wheel(region, { deltaY: -100, ctrlKey: true, clientX: 0, clientY: 0 })

    expect(handlers.onViewportChange.mock.calls[0][0].zoom).toBeGreaterThan(1)
  })

  it('pans with the arrow keys and takes a bigger step with shift', () => {
    const { handlers, region } = renderCanvas()

    fireEvent.keyDown(region, { key: 'ArrowRight' })
    expect(handlers.onViewportChange).toHaveBeenCalledWith({ x: -PAN_STEP, y: 0, zoom: 1 })

    fireEvent.keyDown(region, { key: 'ArrowRight', shiftKey: true })
    expect(handlers.onViewportChange).toHaveBeenCalledWith({ x: -PAN_STEP_LARGE, y: 0, zoom: 1 })
  })

  it('zooms with + and - and resets with 0', () => {
    const { handlers, region } = renderCanvas({ viewport: { x: 0, y: 0, zoom: 2 } })

    fireEvent.keyDown(region, { key: '+' })
    expect(handlers.onViewportChange.mock.calls[0][0].zoom).toBeGreaterThan(2)

    fireEvent.keyDown(region, { key: '0' })
    expect(handlers.onViewportChange.mock.calls[1][0].zoom).toBe(1)
  })

  it('ignores keys that are not viewport commands', () => {
    const { handlers, region } = renderCanvas()

    fireEvent.keyDown(region, { key: 'a' })

    expect(handlers.onViewportChange).not.toHaveBeenCalled()
  })

  it('leaves keys typed inside board content alone', () => {
    const { handlers } = renderCanvas({
      children: <input data-testid="note-input" />,
    })

    fireEvent.keyDown(screen.getByTestId('note-input'), { key: 'ArrowRight', bubbles: true })

    expect(handlers.onViewportChange).not.toHaveBeenCalled()
  })

  it('shows a grab cursor for panning and a crosshair for the pen', () => {
    const { region, rerender } = renderCanvas({ activeTool: 'pan' })
    expect(region.className).toContain('cursor-grab')

    rerender(
      <CanvasViewport
        viewport={base}
        activeTool="pen"
        onViewportChange={vi.fn()}
      />
    )
    expect(screen.getByRole('region', { name: CANVAS }).className).toContain('cursor-crosshair')
  })

  it('switches to a grabbing cursor while actually panning', () => {
    const { region } = renderCanvas({ activeTool: 'pan' })

    fireEvent.pointerDown(region, { clientX: 0, clientY: 0 })

    expect(screen.getByRole('region', { name: CANVAS }).className).toContain('cursor-grabbing')
  })
})
