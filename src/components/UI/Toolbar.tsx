import React, { useRef, useState } from 'react'
import type { CanvasTool } from '../Canvas/CanvasViewport'
import {
  MousePointer2,
  Hand,
  StickyNote,
  Square,
  Circle,
  Shapes,
  ArrowUpRight,
  Pencil,
  Eraser,
  Type,
} from 'lucide-react'

interface ToolbarProps {
  activeTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
}

// Rectangle and circle collapse behind a Shape flyout — at 393px the toolbar
// has no room for a ninth 42px touch target (see docs/context/STU-953.md).
const SHAPE_TOOLS: Array<{ tool: CanvasTool; icon: React.ElementType; label: string }> = [
  { tool: 'rectangle', icon: Square, label: 'Rectangle' },
  { tool: 'circle', icon: Circle, label: 'Circle' },
]

const TOOLS: Array<{ tool: CanvasTool; icon: React.ElementType; label: string; shortcut?: string }> =
  [
    { tool: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { tool: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
    { tool: 'sticky', icon: StickyNote, label: 'Sticky note', shortcut: 'S' },
    { tool: 'connector', icon: ArrowUpRight, label: 'Connector', shortcut: 'L' },
    { tool: 'pen', icon: Pencil, label: 'Pen', shortcut: 'P' },
    { tool: 'text', icon: Type, label: 'Text', shortcut: 'T' },
    { tool: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
  ]

// The shape group is a roving-tabindex stop of its own, sitting where
// `rectangle`/`circle` used to live in TOOLS — between "sticky" and
// "connector". Keeping it out of the `eraser` tail preserves "eraser" as the
// last stop (End / wrap-around), which the pre-existing keyboard tests pin.
const GROUP_STOP_INDEX = 3
const STOP_COUNT = TOOLS.length + 1

/** Maps a TOOLS array index to its position among all roving-tabindex stops. */
function toolStopIndex(toolIndex: number) {
  return toolIndex < GROUP_STOP_INDEX ? toolIndex : toolIndex + 1
}

function ShapeGroup({
  activeTool,
  onToolChange,
  tabIndex,
  buttonRef,
  onArrowKeyDown,
}: {
  activeTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
  tabIndex: number
  buttonRef: (el: HTMLButtonElement | null) => void
  onArrowKeyDown: (e: React.KeyboardEvent) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const groupRef = useRef<HTMLButtonElement>(null)
  const isActive = SHAPE_TOOLS.some(({ tool }) => tool === activeTool)

  // Escape closes and hands focus back, so the flyout is never a keyboard trap.
  const close = () => {
    setIsOpen(false)
    groupRef.current?.focus()
  }

  return (
    <div className="relative">
      {isOpen && (
        <div
          role="group"
          aria-label="Shapes"
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-1
                     rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200"
        >
          {SHAPE_TOOLS.map(({ tool, icon: Icon, label }) => (
            <button
              key={tool}
              type="button"
              aria-label={label}
              aria-pressed={activeTool === tool}
              onClick={() => {
                onToolChange(tool)
                setIsOpen(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') close()
              }}
              className="w-10 h-10 grid place-items-center rounded-lg hover:bg-slate-100"
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <button
        ref={(el) => {
          groupRef.current = el
          buttonRef(el)
        }}
        type="button"
        aria-label="Shape"
        aria-pressed={isActive}
        aria-haspopup="true"
        aria-expanded={isOpen}
        tabIndex={tabIndex}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && isOpen) {
            close()
            return
          }
          onArrowKeyDown(e)
        }}
        className={`w-[42px] h-[42px] grid place-items-center rounded-xl transition-colors ${
          isActive ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Shapes className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  )
}

export function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  // APG toolbar pattern: the toolbar is one tab stop and arrow keys move focus
  // between the tools (including the Shape group). Focus alone never changes
  // the active tool.
  const handleKeyDown = (e: React.KeyboardEvent, stopIndex: number) => {
    const lastIndex = STOP_COUNT - 1
    let nextIndex: number | null = null

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = stopIndex === lastIndex ? 0 : stopIndex + 1
        break
      case 'ArrowLeft':
        nextIndex = stopIndex === 0 ? lastIndex : stopIndex - 1
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = lastIndex
        break
      default:
        return
    }

    e.preventDefault()
    buttonRefs.current[nextIndex]?.focus()
  }

  const isShapeActive = SHAPE_TOOLS.some(({ tool }) => tool === activeTool)
  const activeToolIndex = TOOLS.findIndex(({ tool }) => tool === activeTool)
  const activeStopIndex = isShapeActive
    ? GROUP_STOP_INDEX
    : toolStopIndex(Math.max(0, activeToolIndex))

  const renderTool = (
    { tool, icon: Icon, label, shortcut }: (typeof TOOLS)[number],
    toolIndex: number
  ) => {
    const stopIndex = toolStopIndex(toolIndex)
    const isActive = activeTool === tool

    return (
      <button
        key={tool}
        type="button"
        ref={(el) => {
          buttonRefs.current[stopIndex] = el
        }}
        tabIndex={stopIndex === activeStopIndex ? 0 : -1}
        onKeyDown={(e) => handleKeyDown(e, stopIndex)}
        aria-label={label}
        aria-pressed={isActive}
        title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
        onClick={() => onToolChange(tool)}
        className={`
              relative flex items-center justify-center w-10 h-10 rounded-xl
              transition-all duration-150 ease-out
              ${
                isActive
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 scale-105'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }
            `}
      >
        <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
      </button>
    )
  }

  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      aria-orientation="horizontal"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-900/10"
    >
      {TOOLS.slice(0, GROUP_STOP_INDEX).map((def, i) => renderTool(def, i))}
      <ShapeGroup
        activeTool={activeTool}
        onToolChange={onToolChange}
        tabIndex={activeStopIndex === GROUP_STOP_INDEX ? 0 : -1}
        buttonRef={(el) => {
          buttonRefs.current[GROUP_STOP_INDEX] = el
        }}
        onArrowKeyDown={(e) => handleKeyDown(e, GROUP_STOP_INDEX)}
      />
      {TOOLS.slice(GROUP_STOP_INDEX).map((def, i) => renderTool(def, i + GROUP_STOP_INDEX))}
    </div>
  )
}
