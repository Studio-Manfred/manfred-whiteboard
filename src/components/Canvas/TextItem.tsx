import React, { useState, useRef, useEffect, useMemo } from 'react'
import type { TextElement } from '../../types/whiteboard'
import { ResizeHandles } from './ResizeHandles'
import { handlesFor, type ResizeHandle } from '../../lib/resize'
import type { Point } from '../../lib/coordinates'
import { effectiveTextAlign, fontFamilyStack, textPaddingFor } from '../../lib/element-style'
import { dropShadowFilter, elevationFor } from '../../lib/elevation'
import { canvasMeasure, layoutText, LINE_HEIGHT, type Measure } from '../../lib/text-layout'

// Created on first use, not at import: importing this module must not touch
// the DOM canvas, or every test file that imports TextItem — directly, or
// once the canvas wires it in, transitively through App — pays for jsdom's
// "getContext not implemented" warning whether or not it ever renders a text
// object. The `measure` prop lets a caller (a test, in particular) inject a
// deterministic one instead of ever reaching this fallback at all.
let sharedMeasure: Measure | undefined

function defaultMeasure(): Measure {
  if (!sharedMeasure) sharedMeasure = canvasMeasure()
  return sharedMeasure
}

interface TextItemProps {
  element: TextElement
  isSelected: boolean
  onSelect: (e: React.PointerEvent) => void
  onUpdate: (updated: Partial<TextElement>) => void
  onDragStart: (e: React.PointerEvent) => void
  onResizeStart?: (handle: ResizeHandle, e: React.PointerEvent) => void
  onResizeByKeyboard?: (handle: ResizeHandle, delta: Point) => void
  isDragging?: boolean
  /** Defaults to a lazily-created canvas measurer; tests inject their own. */
  measure?: Measure
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
  measure,
}: TextItemProps) {
  // A freshly created object is always empty text, and empty text is always
  // deleted on blur (see `commit` below) — so the only way an element with
  // `text === ''` can exist is if it was *just* created and never blurred
  // yet. Starting it in edit mode means the user who picked Text and clicked
  // the canvas can type immediately, with no double-click needed, and it
  // means a change of heart (blur with nothing typed) actually reaches
  // `commit` instead of never entering edit at all and leaving a ghost.
  const [isEditing, setIsEditing] = useState(element.text === '')
  const [draft, setDraft] = useState(element.text)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const activeMeasure = measure ?? defaultMeasure()

  useEffect(() => setDraft(element.text), [element.text])

  useEffect(() => {
    if (!isEditing) return
    // Deferred a tick: entering edit mode straight from creation runs this
    // effect inside the very same `pointerdown` that made the element. That
    // event's own default action — refocusing the canvas region, which is
    // keyboard-focusable for WCAG 2.1.1 arrow-key panning — fires *after*
    // listeners finish, so it would steal focus back from the textarea we
    // just focused and fire a spurious blur, deleting the object before the
    // click even finishes. Waiting a tick lets that default action resolve
    // first, so our focus is the one that sticks.
    const id = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(id)
  }, [isEditing])

  // An explicit options literal, rather than passing `element` itself: the
  // effect reads exactly these four fields, and listing them both here and
  // in the dependency array means a fifth field `layoutText` starts reading
  // later goes stale loudly (an exhaustive-deps warning) instead of quietly.
  const layout = useMemo(
    () =>
      layoutText(
        element.text,
        element.width,
        { fontSize: element.fontSize, fontFamily: element.fontFamily },
        activeMeasure
      ),
    [element.text, element.width, element.fontSize, element.fontFamily, activeMeasure]
  )

  // An empty object must still be visible and clickable while you type into
  // it: layoutText reports zero lines and zero height for empty text, which
  // would otherwise collapse the box to nothing. This is the one value used
  // for both the drawn box below and the stored height in the effect below
  // it, so the two cannot diverge — a stored height of 0 for a visibly
  // non-empty box would make hit-testing, marquee selection and export
  // bounds all miss it.
  const drawnHeight = Math.max(layout.height, element.fontSize * LINE_HEIGHT)

  // The height is a cache and the text is the truth, so a disagreement is
  // corrected here — including one synced from a peer that measured
  // differently. Only on a real difference: a patch per keystroke would
  // flood the undo stack.
  useEffect(() => {
    if (Math.abs(drawnHeight - element.height) > 0.5) {
      onUpdate({ height: drawnHeight })
    }
  }, [drawnHeight, element.height, onUpdate])

  const align = effectiveTextAlign(element) ?? 'left'
  const colour = element.textColor ?? '#1e293b'
  // Zero today, by design (a bare text object has no border to lean on) —
  // read through the helper rather than assuming that, so this follows if
  // the decision in element-style.ts ever changes.
  const textPadding = textPaddingFor(element) ?? 0

  const commit = () => {
    setIsEditing(false)
    // Blank text always has to reach the parent, even when it was already
    // blank and nothing was typed — that is the only signal that turns a
    // never-edited placeholder into a delete rather than a silent ghost.
    if (draft.trim() === '' || draft !== element.text) onUpdate({ text: draft })
  }

  // Escape abandons the edit — matching StickyNote, and what a person
  // expects from Escape in a text field. Enter is left alone: this is a
  // multi-line textarea, so its default behaviour of inserting a newline is
  // exactly right and needs no handler.
  const abandon = () => {
    setIsEditing(false)
    setDraft(element.text)
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
        height: `${drawnHeight}px`,
        padding: `${textPadding}px`,
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
            if (e.key === 'Escape') abandon()
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
