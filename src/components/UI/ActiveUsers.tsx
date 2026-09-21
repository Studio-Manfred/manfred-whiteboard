import type { UserAwareness } from '../../types/whiteboard'

interface ActiveUsersProps {
  users: UserAwareness[]
  localUserId: string
}

export function ActiveUsers({ users, localUserId }: ActiveUsersProps) {
  const others = users.filter((u) => u.user.id !== localUserId)

  if (others.length === 0) return null

  return (
    <div
      className="flex items-center -space-x-2"
      role="group"
      aria-label={`${others.length} other user${others.length > 1 ? 's' : ''} online`}
    >
      {others.slice(0, 5).map((user) => (
        <div
          key={user.user.id}
          title={user.user.name}
          className="relative w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-10"
          style={{ backgroundColor: user.user.color }}
        >
          {user.user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {others.length > 5 && (
        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 shadow-sm">
          +{others.length - 5}
        </div>
      )}
    </div>
  )
}
