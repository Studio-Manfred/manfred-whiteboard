import React, { useState, useRef, useEffect } from 'react'
import type { StickyElement, AnchorPosition } from '../../types/whiteboard'

interface StickyNoteProps {
  element: StickyElement
  isSelected: boolean
  onSelect: (e: React.PointerEvent) => void
  onUpdate: (updated: Partial<StickyElement>) => void
  onDragStart: (e: React.PointerEvent) => void
  onAnchorClick?: (anchor: AnchorPosition, e: React.MouseEvent) => void
  onResizeStart?: (e: React.PointerEvent) => void
}

export function StickyNote({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDragStart,
  onAnchorClick,
  onResizeStart,
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

  return (
    <div
      data-testid={`sticky-${element.id}`}
      className={`absolute group pointer-events-auto rounded-lg transition-shadow select-none flex flex-col p-4 ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-xl z-30'
          : 'shadow-md hover:shadow-lg z-10'
      }`}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        backgroundColor: element.color,
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
          className="w-full h-full bg-transparent resize-none outline-none border-none text-slate-800 font-sans leading-snug cursor-text"
          style={{ fontSize: `${element.fontSize || 16}px` }}
        />
      ) : (
        <div
          className="w-full h-full whitespace-pre-wrap break-words text-slate-800 font-sans leading-snug overflow-hidden"
          style={{ fontSize: `${element.fontSize || 16}px` }}
        >
          {element.text || (
            <span className="text-slate-400 italic">Double-click to write...</span>
          )}
        </div>
      )}

      {/* 4 Connection Anchors */}
      {anchors.map((anchor) => {
        const positionClasses = {
          top: '-top-2 left-1/2 -translate-x-1/2',
          right: '-right-2 top-1/2 -translate-y-1/2',
          bottom: '-bottom-2 left-1/2 -translate-x-1/2',
          left: '-left-2 top-1/2 -translate-y-1/2',
        }[anchor]

        return (
          <button
            key={anchor}
            type="button"
            aria-label={`Connect from ${anchor} anchor`}
            onClick={(e) => {
              e.stopPropagation()
              onAnchorClick?.(anchor, e)
            }}
            className={`absolute ${positionClasses} w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-pointer z-40 shadow-sm`}
          />
        )
      })}

      {/* Resize Handle */}
      {isSelected && onResizeStart && (
        <div
          aria-label="Resize element"
          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm cursor-nwse-resize z-40 shadow-sm"
          onPointerDown={(e) => {
            e.stopPropagation()
            onResizeStart(e)
          }}
        />
      )}
    </div>
  )
}
