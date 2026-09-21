import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ZoomControls } from '../src/components/UI/ZoomControls'
import { MAX_ZOOM, MIN_ZOOM, type Viewport } from '../src/lib/coordinates'

const base: Viewport = { x: 0, y: 0, zoom: 1 }

function screenCentre() {
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

describe('ZoomControls', () => {
  it('is an accessibly labelled group of controls', () => {
    render(<ZoomControls viewport={base} onViewportChange={vi.fn()} />)

    expect(screen.getByRole('complementary', { name: 'Zoom controls' })).toBeInTheDocument()
  })

  it('shows the zoom level as a rounded percentage', () => {
    const { rerender } = render(<ZoomControls viewport={base} onViewportChange={vi.fn()} />)
    expect(screen.getByText('100%')).toBeInTheDocument()

    rerender(<ZoomControls viewport={{ ...base, zoom: 1.337 }} onViewportChange={vi.fn()} />)
    expect(screen.getByText('134%')).toBeInTheDocument()
  })

  it('zooms in and out in steps', () => {
    const onViewportChange = vi.fn()
    render(<ZoomControls viewport={base} onViewportChange={onViewportChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Zoom In' }))
    expect(onViewportChange.mock.calls[0][0].zoom).toBeCloseTo(1.15)

    fireEvent.click(screen.getByRole('button', { name: 'Zoom Out' }))
    expect(onViewportChange.mock.calls[1][0].zoom).toBeCloseTo(0.85)
  })

  it('keeps the point at the centre of the screen fixed while zooming', () => {
    const onViewportChange = vi.fn()
    const viewport: Viewport = { x: -300, y: -120, zoom: 2 }
    render(<ZoomControls viewport={viewport} onViewportChange={onViewportChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Zoom In' }))

    const next = onViewportChange.mock.calls[0][0] as Viewport
    const centre = screenCentre()
    const worldBefore = (centre.x - viewport.x) / viewport.zoom
    expect(worldBefore * next.zoom + next.x).toBeCloseTo(centre.x)
  })

  it('resets to 100% without losing the centred point', () => {
    const onViewportChange = vi.fn()
    const viewport: Viewport = { x: -300, y: -120, zoom: 3 }
    render(<ZoomControls viewport={viewport} onViewportChange={onViewportChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reset Zoom to 100%' }))

    const next = onViewportChange.mock.calls[0][0] as Viewport
    const centre = screenCentre()
    const worldBefore = (centre.y - viewport.y) / viewport.zoom
    expect(next.zoom).toBe(1)
    expect(worldBefore * next.zoom + next.y).toBeCloseTo(centre.y)
  })

  it('clamps at both ends of the zoom range', () => {
    const onViewportChange = vi.fn()
    const { rerender } = render(
      <ZoomControls viewport={{ ...base, zoom: MAX_ZOOM }} onViewportChange={onViewportChange} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Zoom In' }))
    expect(onViewportChange.mock.calls[0][0].zoom).toBe(MAX_ZOOM)

    rerender(
      <ZoomControls viewport={{ ...base, zoom: MIN_ZOOM }} onViewportChange={onViewportChange} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Zoom Out' }))
    expect(onViewportChange.mock.calls[1][0].zoom).toBe(MIN_ZOOM)
  })

  it('offers zoom-to-fit only when a handler is supplied', () => {
    const onZoomToFit = vi.fn()
    const { rerender } = render(<ZoomControls viewport={base} onViewportChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Zoom to Fit' })).not.toBeInTheDocument()

    rerender(
      <ZoomControls viewport={base} onViewportChange={vi.fn()} onZoomToFit={onZoomToFit} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Zoom to Fit' }))
    expect(onZoomToFit).toHaveBeenCalledOnce()
  })
})
