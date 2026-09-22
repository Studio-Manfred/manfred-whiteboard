
import { ActiveUsers } from './ActiveUsers'
import { UndoRedoControls } from './UndoRedoControls'
import { ExportMenu } from './ExportMenu'
import type { UserAwareness } from '../../types/whiteboard'

interface TopNavProps {
  roomName: string
  users: UserAwareness[]
  localUserId: string
  export?: {
    png: () => void
    json: () => void
  }
  /** Omitted until the board document is ready. */
  history?: {
    canUndo: boolean
    canRedo: boolean
    onUndo: () => void
    onRedo: () => void
  }
}

export function TopNav({
  roomName,
  users,
  localUserId,
  history,
  export: exportActions,
}: TopNavProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      {/* Left: Brand + room */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="text-sm font-semibold text-slate-800 tracking-tight">
            Manfred Whiteboard
          </span>
        </div>
        <div className="w-px h-5 bg-slate-200" />
        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
          {roomName}
        </span>
      </div>

      {/* Right: history, then presence */}
      <div className="flex items-center gap-3">
        {exportActions && (
          <ExportMenu
            onExportPng={exportActions.png}
            onExportJson={exportActions.json}
          />
        )}
        {history && (
          <UndoRedoControls
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={history.onUndo}
            onRedo={history.onRedo}
          />
        )}
        <ActiveUsers users={users} localUserId={localUserId} />
      </div>
    </header>
  )
}
