import React, { useRef } from 'react'
import type { CanvasTool } from '../Canvas/CanvasViewport'
import { ColorPicker } from './ColorPicker'
import type { ColorTarget } from '../../lib/element-colors'
import {
  MousePointer2,
  Hand,
  StickyNote,
  Square,
  Circle,
  ArrowUpRight,
  Pencil,
  Eraser,
} from 'lucide-react'

interface ToolbarProps {
  activeTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
  color: {
    /** Current fill: the selection's, or the colour the next note will take. */
    value: string
    showBorder: boolean
    onSelect: (color: string, target: ColorTarget) => void
  }
}

const TOOLS: Array<{ tool: CanvasTool; icon: React.ElementType; label: string; shortcut?: string }> =
  [
    { tool: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { tool: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
    { tool: 'sticky', icon: StickyNote, label: 'Sticky note', shortcut: 'S' },
    { tool: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
    { tool: 'circle', icon: Circle, label: 'Circle', shortcut: 'C' },
    { tool: 'connector', icon: ArrowUpRight, label: 'Connector', shortcut: 'L' },
    { tool: 'pen', icon: Pencil, label: 'Pen', shortcut: 'P' },
    { tool: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
  ]

export function Toolbar({ activeTool, onToolChange, color }: ToolbarProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  // APG toolbar pattern: the toolbar is one tab stop and arrow keys move focus
  // between the tools. Focus alone never changes the active tool.
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const lastIndex = TOOLS.length // the colour trigger sits after the tools
    let nextIndex: number | null = null

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = index === lastIndex ? 0 : index + 1
        break
      case 'ArrowLeft':
        nextIndex = index === 0 ? lastIndex : index - 1
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

  const activeIndex = Math.max(
    0,
    TOOLS.findIndex(({ tool }) => tool === activeTool)
  )

  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      aria-orientation="horizontal"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-900/10"
    >
      {TOOLS.map(({ tool, icon: Icon, label, shortcut }, index) => {
        const isActive = activeTool === tool

        return (
          <button
            key={tool}
            type="button"
            ref={(el) => {
              buttonRefs.current[index] = el
            }}
            tabIndex={index === activeIndex ? 0 : -1}
            onKeyDown={(e) => handleKeyDown(e, index)}
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
      })}

      <span aria-hidden="true" className="w-px h-6 bg-slate-200 mx-1" />

      <ColorPicker
        value={color.value}
        showBorder={color.showBorder}
        onSelect={color.onSelect}
        tabIndex={activeIndex === TOOLS.length ? 0 : -1}
        onKeyDown={(e) => handleKeyDown(e, TOOLS.length)}
        buttonRef={(el) => {
          buttonRefs.current[TOOLS.length] = el
        }}
      />
    </div>
  )
}
