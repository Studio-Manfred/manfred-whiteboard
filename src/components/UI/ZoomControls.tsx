import { Plus, Minus, Maximize2 } from 'lucide-react'
import { clampZoom, type Viewport } from '../../lib/coordinates'

interface ZoomControlsProps {
  viewport: Viewport
  onViewportChange: (viewport: Viewport) => void
  onZoomToFit?: () => void
}

export function ZoomControls({
  viewport,
  onViewportChange,
  onZoomToFit,
}: ZoomControlsProps) {
  const percentage = Math.round(viewport.zoom * 100)

  const handleZoom = (delta: number) => {
    // Zoom around screen center
    const screenCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const newZoom = clampZoom(viewport.zoom + delta)
    const worldCenter = {
      x: (screenCenter.x - viewport.x) / viewport.zoom,
      y: (screenCenter.y - viewport.y) / viewport.zoom,
    }
    const newX = screenCenter.x - worldCenter.x * newZoom
    const newY = screenCenter.y - worldCenter.y * newZoom

    onViewportChange({ x: newX, y: newY, zoom: newZoom })
  }

  const handleResetZoom = () => {
    const screenCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const worldCenter = {
      x: (screenCenter.x - viewport.x) / viewport.zoom,
      y: (screenCenter.y - viewport.y) / viewport.zoom,
    }
    onViewportChange({
      x: screenCenter.x - worldCenter.x,
      y: screenCenter.y - worldCenter.y,
      zoom: 1,
    })
  }

  return (
    <aside
      aria-label="Zoom controls"
      className="fixed bottom-6 right-6 z-40 flex items-center bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg rounded-xl p-1 gap-1 text-slate-700 text-xs font-medium"
    >
      <button
        type="button"
        onClick={() => handleZoom(-0.15)}
        className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors"
        title="Zoom Out (Cmd/Ctrl + Minus)"
        aria-label="Zoom Out"
      >
        <Minus className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={handleResetZoom}
        className="px-2 py-1 min-w-[50px] text-center hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors font-mono font-semibold"
        title="Reset to 100%"
        aria-label="Reset Zoom to 100%"
      >
        {percentage}%
      </button>

      <button
        type="button"
        onClick={() => handleZoom(0.15)}
        className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors"
        title="Zoom In (Cmd/Ctrl + Plus)"
        aria-label="Zoom In"
      >
        <Plus className="w-4 h-4" />
      </button>

      {onZoomToFit && (
        <button
          type="button"
          onClick={onZoomToFit}
          className="p-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors ml-1 border-l border-slate-200 pl-2"
          title="Zoom to Fit"
          aria-label="Zoom to Fit"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
    </aside>
  )
}
