import { type Viewport } from '../../lib/coordinates'

interface DotGridProps {
  viewport: Viewport
}

export function DotGrid({ viewport }: DotGridProps) {
  const baseSpacing = 28
  const scaledSpacing = baseSpacing * viewport.zoom
  const offsetX = ((viewport.x % scaledSpacing) + scaledSpacing) % scaledSpacing
  const offsetY = ((viewport.y % scaledSpacing) + scaledSpacing) % scaledSpacing
  const dotSize = Math.max(1, Math.min(2.5, 1.5 * Math.sqrt(viewport.zoom)))

  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: `radial-gradient(#94a3b8 ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${scaledSpacing}px ${scaledSpacing}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
        opacity: Math.min(0.8, Math.max(0.2, viewport.zoom * 0.4)),
      }}
    />
  )
}
