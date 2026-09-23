import React, { useEffect, useRef, useState } from 'react'

interface BarPopoverProps {
  /** Accessible name for the trigger, e.g. "Fill colour". */
  label: string
  /** What the trigger shows: a swatch, a number, a line. */
  children: React.ReactNode
  /** Panel contents. `close` returns focus to the trigger. */
  renderPanel: (close: () => void) => React.ReactNode
  /**
   * Which way the panel opens. It must open away from the selection, or it
   * covers the very thing being restyled.
   */
  panelPlacement?: 'up' | 'down'
  /** Supplied by the bar so the trigger joins its roving tabindex. */
  tabIndex?: number
  onKeyDown?: (e: React.KeyboardEvent) => void
  buttonRef?: (el: HTMLButtonElement | null) => void
}

/**
 * A properties-bar control: a labelled trigger with a panel underneath.
 * Closes on Escape or an outside press, and always hands focus back.
 */
export function BarPopover({
  label,
  children,
  renderPanel,
  panelPlacement = 'down',
  tabIndex,
  onKeyDown,
  buttonRef,
}: BarPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      close()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

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
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={label}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex items-center justify-center gap-1 h-8 min-w-8 px-1.5 rounded-lg transition-colors ${
          isOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        {children}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={label}
          className={`absolute left-1/2 -translate-x-1/2 p-2 rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 z-10 ${
            panelPlacement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {renderPanel(close)}
        </div>
      )}
    </div>
  )
}
