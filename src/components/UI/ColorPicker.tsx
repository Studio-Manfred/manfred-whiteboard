import React, { useEffect, useRef, useState } from 'react'
import { Palette } from 'lucide-react'
import {
  BORDER_SWATCHES,
  FILL_SWATCHES,
  NO_FILL,
  colorName,
  type ColorTarget,
} from '../../lib/element-colors'

interface ColorPickerProps {
  /** The current fill, previewed on the trigger. */
  value: string
  /** Hidden when nothing in the selection has a border to paint. */
  showBorder: boolean
  onSelect: (color: string, target: ColorTarget) => void
  /** Supplied by the toolbar so the trigger joins its roving tabindex. */
  tabIndex?: number
  onKeyDown?: (e: React.KeyboardEvent) => void
  buttonRef?: (el: HTMLButtonElement | null) => void
}

function Swatch({
  color,
  isCurrent,
  onSelect,
}: {
  color: string
  isCurrent: boolean
  onSelect: () => void
}) {
  const isEmpty = color === NO_FILL

  return (
    <button
      type="button"
      aria-label={colorName(color)}
      aria-pressed={isCurrent}
      onClick={onSelect}
      style={isEmpty ? undefined : { backgroundColor: color }}
      className={`relative w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
        isCurrent ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-300'
      } ${isEmpty ? 'bg-white' : ''}`}
    >
      {isEmpty && (
        <span
          aria-hidden="true"
          className="absolute inset-0 m-auto h-px w-5 rotate-45 bg-red-400"
        />
      )}
    </button>
  )
}

/**
 * Colour control for the toolbar. The trigger is a toolbar item; the swatches
 * inside the popover deliberately are not, so the toolbar keeps a single tab
 * stop and arrow keys never wander into the palette.
 */
export function ColorPicker({
  value,
  showBorder,
  onSelect,
  tabIndex,
  onKeyDown,
  buttonRef,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false)
    }

    // Escape is handled here rather than on the panel so it works wherever
    // focus sits — trigger, swatch, or nothing in particular.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setIsOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const choose = (color: string, target: ColorTarget) => {
    onSelect(color, target)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        ref={(el) => {
          triggerRef.current = el
          buttonRef?.(el)
        }}
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
        aria-label="Colours"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title="Colours"
        onClick={() => setIsOpen((open) => !open)}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
          isOpen ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-100'
        }`}
      >
        <Palette size={20} strokeWidth={1.8} />
        <span
          aria-hidden="true"
          style={value === NO_FILL ? undefined : { backgroundColor: value }}
          className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${
            value === NO_FILL ? 'bg-slate-200' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Colours"
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-3 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10"
        >
          <div role="group" aria-label="Fill" className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 px-0.5">Fill</span>
            <div className="flex items-center gap-1.5">
              {FILL_SWATCHES.map((color) => (
                <Swatch
                  key={color}
                  color={color}
                  isCurrent={color === value}
                  onSelect={() => choose(color, 'fill')}
                />
              ))}
            </div>
          </div>

          {showBorder && (
            <div role="group" aria-label="Border" className="flex flex-col gap-1.5 mt-3">
              <span className="text-[11px] font-medium text-slate-500 px-0.5">Border</span>
              <div className="flex items-center gap-1.5">
                {BORDER_SWATCHES.map((color) => (
                  <Swatch
                    key={color}
                    color={color}
                    isCurrent={false}
                    onSelect={() => choose(color, 'border')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
