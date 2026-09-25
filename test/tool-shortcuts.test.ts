import { describe, it, expect } from 'vitest'
import { toolForShortcut, TOOL_SHORTCUTS } from '../src/lib/tool-shortcuts'

describe('toolForShortcut', () => {
  it('maps each documented shortcut to its tool', () => {
    expect(toolForShortcut('v')).toBe('select')
    expect(toolForShortcut('h')).toBe('pan')
    expect(toolForShortcut('s')).toBe('sticky')
    expect(toolForShortcut('r')).toBe('rectangle')
    expect(toolForShortcut('c')).toBe('circle')
    expect(toolForShortcut('l')).toBe('connector')
    expect(toolForShortcut('p')).toBe('pen')
    expect(toolForShortcut('e')).toBe('eraser')
    expect(toolForShortcut('t')).toBe('text')
  })

  it('is case-insensitive', () => {
    expect(toolForShortcut('V')).toBe('select')
    expect(toolForShortcut('E')).toBe('eraser')
  })

  it('returns null for anything else', () => {
    expect(toolForShortcut('z')).toBeNull()
    expect(toolForShortcut('Enter')).toBeNull()
    expect(toolForShortcut('')).toBeNull()
  })

  it('covers every tool exactly once', () => {
    const tools = Object.values(TOOL_SHORTCUTS)
    expect(new Set(tools).size).toBe(tools.length)
    expect(tools).toHaveLength(9)
  })
})
