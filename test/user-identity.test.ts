import { describe, it, expect } from 'vitest'
import { generateUser, USER_NAMES, USER_COLORS } from '../src/lib/user-identity'

describe('generateUser', () => {
  it('produces a name and colour from the palettes', () => {
    const user = generateUser()

    expect(USER_NAMES).toContain(user.name)
    expect(USER_COLORS).toContain(user.color)
  })

  it('gives every session a distinct id', () => {
    expect(generateUser().id).not.toBe(generateUser().id)
  })

  it('pairs the name and colour by the same index, so a name always looks the same', () => {
    const pick = () => 0
    const user = generateUser({ random: pick })

    expect(user.name).toBe(USER_NAMES[0])
    expect(user.color).toBe(USER_COLORS[0])
  })

  it('stays in range when the random source returns its upper bound', () => {
    const user = generateUser({ random: () => 0.999999 })

    expect(USER_NAMES).toContain(user.name)
    expect(USER_COLORS).toContain(user.color)
  })

  it('keeps the two palettes the same length', () => {
    expect(USER_NAMES).toHaveLength(USER_COLORS.length)
  })
})
