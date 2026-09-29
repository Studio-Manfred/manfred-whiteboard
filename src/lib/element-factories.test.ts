// Guards the option threading for STU-980 (change-stroke-colour). The
// consumer designer's DS-first check surfaced STU-979 (DS ColorPicker);
// this factory picks up the user-chosen colour when creating a stroke.

import { describe, it, expect } from 'vitest'
import { createDrawingElement } from './element-factories'
import type { InkPoint } from './ink'

const POINTS: readonly InkPoint[] = [
  { x: 0, y: 0 },
  { x: 10, y: 10 },
]

describe('createDrawingElement', () => {
  it('defaults strokeColor to the ink default when none is provided', () => {
    const element = createDrawingElement(POINTS, { zIndex: 1 })
    expect(element.strokeColor).toBe('#0f172a')
  })

  it('uses options.strokeColor when provided (STU-980)', () => {
    const element = createDrawingElement(POINTS, { zIndex: 1, strokeColor: '#2c28ec' })
    expect(element.strokeColor).toBe('#2c28ec')
  })
})
