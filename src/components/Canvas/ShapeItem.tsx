import React, { useState, useRef, useEffect } from 'react'
import type { ShapeElement, AnchorPosition } from '../../types/whiteboard'
import { ResizeHandles } from './ResizeHandles'
import type { ResizeHandle } from '../../lib/resize'
import type { Point } from '../../lib/coordinates'

interface ShapeItemProps {
  element: ShapeElement
  isSelected: boolean
  onSelect: (e: React.PointerEvent) => void
  onUpdate: (updated: Partial<ShapeElement>) => void
  onDragStart: (e: React.PointerEvent) => void
  onAnchorClick?: (anchor: AnchorPosition, e: React.MouseEvent) => void
  onResizeStart?: (handle: ResizeHandle, e: React.PointerEvent) => void
  onResizeByKeyboard?: (handle: ResizeHandle, delta: Point) => void
}

export function ShapeItem({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDragStart,
  onAnchorClick,
  onResizeStart,
  onResizeByKeyboard,
}: ShapeItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(element.text || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText(element.text || '')
  }, [element.text])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    if (text !== (element.text || '')) {
      onUpdate({ text })
    }
  }

  const anchors: AnchorPosition[] = ['top', 'right', 'bottom', 'left']

  return (
    <div
      data-testid={`shape-${element.id}`}
      className={`absolute group pointer-events-auto select-none flex items-center justify-center ${
        isSelected ? 'ring-2 ring-blue-500 z-30' : 'z-10'
      }`}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
      }}
      onPointerDown={(e) => {
        if (!isEditing) {
          onSelect(e)
          onDragStart(e)
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
    >
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
        {element.shapeType === 'circle' ? (
          <ellipse
            cx={element.width / 2}
            cy={element.height / 2}
            rx={element.width / 2}
            ry={element.height / 2}
            fill={element.fillColor || 'transparent'}
            stroke={element.strokeColor || '#0f172a'}
            strokeWidth={element.strokeWidth || 2}
          />
        ) : (
          <rect
            x={0}
            y={0}
            width={element.width}
            height={element.height}
            rx={8}
            fill={element.fillColor || 'transparent'}
            stroke={element.strokeColor || '#0f172a'}
            strokeWidth={element.strokeWidth || 2}
          />
        )}
      </svg>

      {/* Centered label or input */}
      <div className="relative z-20 px-2 text-center max-w-full">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                handleBlur()
              }
            }}
            className="w-full bg-transparent text-center outline-none font-medium text-slate-800 text-sm"
          />
        ) : (
          <span className="text-slate-800 font-medium text-sm break-words">
            {element.text}
          </span>
        )}
      </div>

      {/* 4 Connection Anchors */}
      {anchors.map((anchor) => {
        // Sit clear of the resize handles, which straddle the edge itself:
        // overlapping them made an anchor impossible to click once selection
        // put the handles on screen.
        const positionClasses = {
          top: '-top-5 left-1/2 -translate-x-1/2',
          right: '-right-5 top-1/2 -translate-y-1/2',
          bottom: '-bottom-5 left-1/2 -translate-x-1/2',
          left: '-left-5 top-1/2 -translate-y-1/2',
        }[anchor]

        return (
          <button
            key={anchor}
            type="button"
            aria-label={`Connect from ${anchor} anchor`}
            // Pointer down must not reach the element beneath: it would select
            // it, start a drag, and — mid connector-draw — be taken as the
            // click that completes the connector.
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onAnchorClick?.(anchor, e)
            }}
            className={`absolute ${positionClasses} w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-pointer z-40 shadow-sm`}
          />
        )
      })}

      {/* Resize handles: corners and edges */}
      {isSelected && onResizeStart && onResizeByKeyboard && (
        <ResizeHandles
          onResizeStart={onResizeStart}
          onResizeByKeyboard={onResizeByKeyboard}
        />
      )}
    </div>
  )
}
