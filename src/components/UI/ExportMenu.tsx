import React, { useEffect, useRef, useState } from 'react'
import { Download, FileJson, Image as ImageIcon } from 'lucide-react'

interface ExportMenuProps {
  onExportPng: () => void
  onExportJson: () => void
}

/** Download the board as a picture, or as a backup you can read back in. */
export function ExportMenu({ onExportPng, onExportJson }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (!isOpen) return

    itemRefs.current[0]?.focus()

    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
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

  const run = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  const moveFocus = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const last = itemRefs.current.length - 1
    const next =
      e.key === 'ArrowDown'
        ? index === last
          ? 0
          : index + 1
        : index === 0
          ? last
          : index - 1
    itemRefs.current[next]?.focus()
  }

  const items = [
    { label: 'PNG image', icon: ImageIcon, action: onExportPng },
    { label: 'JSON backup', icon: FileJson, action: onExportJson },
  ]

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        ref={triggerRef}
        aria-label="Export"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Export this board"
        onClick={() => setIsOpen((open) => !open)}
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
          isOpen ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Download size={16} strokeWidth={1.8} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Export"
          className="absolute right-0 top-full mt-2 min-w-[11rem] p-1 rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10"
        >
          {items.map(({ label, icon: Icon, action }, index) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              onClick={() => run(action)}
              onKeyDown={(e) => moveFocus(e, index)}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 text-left"
            >
              <Icon size={15} strokeWidth={1.8} className="text-slate-400" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
