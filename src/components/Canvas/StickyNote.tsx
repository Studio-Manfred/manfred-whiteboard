import React, { useState, useRef, useEffect } from 'react'
import type { StickyElement, AnchorPosition } from '../../types/whiteboard'
import { ResizeHandles } from './ResizeHandles'
import type { ResizeHandle } from '../../lib/resize'
import type { Point } from '../../lib/coordinates'
import {
  effectiveTextAlign,
  fontFamilyStack,
  textPaddingFor,
} from '../../lib/element-style'

interface StickyNoteProps {
  element: StickyElement
  isSelected: boolean
  onSelect: (e: React.PointerEvent) => void
  onUpdate: (updated: Partial<StickyElement>) => void
  onDragStart: (e: React.PointerEvent) => void
  /** Pointer press on an anchor: begins dragging an arrow out of it. */
  onAnchorDragStart?: (anchor: AnchorPosition, e: React.PointerEvent) => void
  /** Keyboard activation of an anchor — dragging is not available by keyboard. */
  onAnchorKeyActivate?: (anchor: AnchorPosition) => void
  /** Show the anchors regardless of hover, while an arrow is being drawn. */
  showAnchors?: boolean
  /** The anchor a dragged arrow would currently land on. */
  highlightedAnchor?: AnchorPosition | null
  onResizeStart?: (handle: ResizeHandle, e: React.PointerEvent) => void
  onResizeByKeyboard?: (handle: ResizeHandle, delta: Point) => void
}

export function StickyNote({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDragStart,
  onAnchorDragStart,
  onAnchorKeyActivate,
  showAnchors = false,
  highlightedAnchor = null,
  onResizeStart,
  onResizeByKeyboard,
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(element.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setText(element.text)
  }, [element.text])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    if (text !== element.text) {
      onUpdate({ text })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false)
      setText(element.text)
    }
  }

  const anchors: AnchorPosition[] = ['top', 'right', 'bottom', 'left']
  const textPadding = textPaddingFor(element) ?? 0

  return (
    <div
      data-testid={`sticky-${element.id}`}
      className={`absolute z-10 group pointer-events-auto rounded-lg transition-shadow select-none flex flex-col ${
        isSelected ? 'ring-2 ring-blue-500 shadow-xl' : 'shadow-md hover:shadow-lg'
      }`}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        backgroundColor: element.color,
        padding: `${textPadding}px`,
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
      {/* Inline Text or Display */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent resize-none outline-none border-none text-slate-800 leading-snug cursor-text"
          style={{
            fontSize: `${element.fontSize || 16}px`,
            fontFamily: fontFamilyStack(element.fontFamily),
            textAlign: effectiveTextAlign(element) ?? 'left',
          }}
        />
      ) : (
        <div
          className="w-full h-full whitespace-pre-wrap break-words text-slate-800 leading-snug overflow-hidden"
          style={{
            fontSize: `${element.fontSize || 16}px`,
            fontFamily: fontFamilyStack(element.fontFamily),
            textAlign: effectiveTextAlign(element) ?? 'left',
          }}
        >
          {element.text || (
            <span className="text-slate-400 italic">Double-click to write...</span>
          )}
        </div>
      )}

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

        const isSnapTarget = highlightedAnchor === anchor

        return (
          <button
            key={anchor}
            type="button"
            aria-label={`Connect from ${anchor} anchor`}
            data-snap-target={isSnapTarget ? 'true' : undefined}
            // Pointer down must not reach the element beneath: it would select
            // it and start dragging the element instead of drawing an arrow.
            onPointerDown={(e) => {
              e.stopPropagation()
              onAnchorDragStart?.(anchor, e)
            }}
            onClick={(e) => {
              e.stopPropagation()
              // detail 0 means the button was activated from the keyboard,
              // where dragging is not an option.
              if (e.detail === 0) onAnchorKeyActivate?.(anchor)
            }}
            className={`absolute ${positionClasses} w-3.5 h-3.5 border-2 border-white rounded-full transition-all cursor-crosshair z-40 shadow-sm ${
              showAnchors || isSnapTarget ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } ${
              isSnapTarget
                ? 'bg-blue-600 scale-150 ring-2 ring-blue-300'
                : 'bg-blue-500 hover:scale-125'
            }`}
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
