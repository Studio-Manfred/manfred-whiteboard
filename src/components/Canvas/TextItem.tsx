import React, { useState, useRef, useEffect, useMemo } from 'react'
import type { TextElement } from '../../types/whiteboard'
import { ResizeHandles } from './ResizeHandles'
import { handlesFor, type ResizeHandle } from '../../lib/resize'
import type { Point } from '../../lib/coordinates'
import { effectiveTextAlign, fontFamilyStack } from '../../lib/element-style'
import { dropShadowFilter, elevationFor } from '../../lib/elevation'
import { canvasMeasure, layoutText, LINE_HEIGHT } from '../../lib/text-layout'

/** One measurer for the whole app: it caches, and a per-render one would not. */
const measure = canvasMeasure()

interface TextItemProps {
  element: TextElement
  isSelected: boolean
  onSelect: (e: React.PointerEvent) => void
  onUpdate: (updated: Partial<TextElement>) => void
  onDragStart: (e: React.PointerEvent) => void
  onResizeStart?: (handle: ResizeHandle, e: React.PointerEvent) => void
  onResizeByKeyboard?: (handle: ResizeHandle, delta: Point) => void
  isDragging?: boolean
}

export function TextItem({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDragStart,
  onResizeStart,
  onResizeByKeyboard,
  isDragging = false,
}: TextItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(element.text)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => setDraft(element.text), [element.text])

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const layout = useMemo(
    () => layoutText(element.text, element.width, element, measure),
    [element.text, element.width, element.fontSize, element.fontFamily]
  )

  // The height is a cache and the text is the truth, so a disagreement is
  // corrected here — including one synced from a peer that measured
  // differently. Only on a real difference: a patch per keystroke would
  // flood the undo stack.
  useEffect(() => {
    if (Math.abs(layout.height - element.height) > 0.5) {
      onUpdate({ height: layout.height })
    }
  }, [layout.height, element.height, onUpdate])

  const align = effectiveTextAlign(element) ?? 'left'
  const colour = element.textColor ?? '#1e293b'

  const commit = () => {
    setIsEditing(false)
    if (draft !== element.text) onUpdate({ text: draft })
  }

  return (
    <div
      data-testid={`text-${element.id}`}
      className={`absolute z-10 group pointer-events-auto select-none ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${Math.max(layout.height, element.fontSize * LINE_HEIGHT)}px`,
        filter: dropShadowFilter(elevationFor({ isSelected, isDragging })),
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
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') commit()
          }}
          style={{
            fontSize: `${element.fontSize}px`,
            fontFamily: fontFamilyStack(element.fontFamily),
            textAlign: align,
            lineHeight: LINE_HEIGHT,
            color: colour,
          }}
          className="w-full h-full bg-transparent outline-none resize-none"
        />
      ) : (
        <div
          data-testid="text-body"
          style={{
            fontSize: `${element.fontSize}px`,
            fontFamily: fontFamilyStack(element.fontFamily),
            textAlign: align,
            lineHeight: LINE_HEIGHT,
            color: colour,
          }}
        >
          {/* One node per laid-out line: the browser must not re-flow the
              text, or the screen and the export would break differently. */}
          {layout.lines.map((line, i) => (
            <div key={i} data-testid="text-line" style={{ whiteSpace: 'pre' }}>
              {line === '' ? ' ' : line}
            </div>
          ))}
        </div>
      )}

      {isSelected && onResizeStart && onResizeByKeyboard && (
        <ResizeHandles
          handles={handlesFor(element)}
          onResizeStart={onResizeStart}
          onResizeByKeyboard={onResizeByKeyboard}
        />
      )}
    </div>
  )
}
