
import type { UserAwareness } from '../../types/whiteboard'

interface MultiplayerCursorsProps {
  /** Remote user awareness states (excludes local user) */
  remoteUsers: UserAwareness[]
}

const CURSOR_SVG_PATH =
  'M0 0 L0 18 L4.5 14 L9 22 L12 20 L7.5 12 L14 12 Z'

export function MultiplayerCursors({ remoteUsers }: MultiplayerCursorsProps) {
  return (
    <>
      {remoteUsers.map((user) => {
        if (!user.cursor) return null

        return (
          <div
            key={user.user.id}
            data-testid={`cursor-${user.user.id}`}
            className="absolute pointer-events-none transition-transform duration-75 ease-out"
            style={{
              left: `${user.cursor.x}px`,
              top: `${user.cursor.y}px`,
              zIndex: 9999,
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="20"
              height="26"
              viewBox="0 0 20 26"
              fill="none"
              className="drop-shadow-md"
            >
              <path
                d={CURSOR_SVG_PATH}
                fill={user.user.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            {/* Name label */}
            <span
              className="absolute left-5 top-4 px-2 py-0.5 rounded-md text-xs font-medium text-white whitespace-nowrap shadow-md"
              style={{ backgroundColor: user.user.color }}
            >
              {user.user.name}
            </span>
          </div>
        )
      })}
    </>
  )
}
