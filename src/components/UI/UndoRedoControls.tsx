import { Undo2, Redo2 } from 'lucide-react'

interface UndoRedoControlsProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

const buttonClass =
  'flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 transition-colors ' +
  'hover:bg-slate-100 hover:text-slate-800 ' +
  'disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed'

/**
 * Undo/redo as visible controls. The shortcuts have always worked; without
 * these, nothing on screen said so and pointer-only users had no way in.
 */
export function UndoRedoControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: UndoRedoControlsProps) {
  return (
    <div role="group" aria-label="History" className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (Cmd/Ctrl + Z)"
        className={buttonClass}
      >
        <Undo2 size={16} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (Cmd/Ctrl + Shift + Z)"
        className={buttonClass}
      >
        <Redo2 size={16} strokeWidth={1.8} />
      </button>
    </div>
  )
}
