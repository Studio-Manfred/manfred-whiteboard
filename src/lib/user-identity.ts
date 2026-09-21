/** The throwaway identity this browser session presents to other collaborators. */

export const USER_NAMES = [
  'Alice',
  'Bob',
  'Charlie',
  'Dana',
  'Eve',
  'Frank',
  'Grace',
  'Hank',
] as const

export const USER_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
] as const

export interface LocalUser {
  id: string
  name: string
  color: string
}

export interface GenerateUserOptions {
  /** Injectable for deterministic tests. */
  random?: () => number
}

/** Name and colour are picked by the same index, so a given name always looks the same. */
export function generateUser({ random = Math.random }: GenerateUserOptions = {}): LocalUser {
  const index = Math.min(Math.floor(random() * USER_NAMES.length), USER_NAMES.length - 1)

  return {
    id: crypto.randomUUID(),
    name: USER_NAMES[index],
    color: USER_COLORS[index],
  }
}
