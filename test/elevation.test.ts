import { describe, it, expect } from 'vitest'
import {
  elevationFor,
  boxShadowClass,
  dropShadowFilter,
  ELEVATIONS,
} from '../src/lib/elevation'

describe('elevationFor', () => {
  it('rests when an element is neither selected nor moving', () => {
    expect(elevationFor({ isSelected: false, isDragging: false })).toBe('resting')
  })

  it('lifts a selected element', () => {
    expect(elevationFor({ isSelected: true, isDragging: false })).toBe('selected')
  })

  it('lifts a moving element further still', () => {
    expect(elevationFor({ isSelected: true, isDragging: true })).toBe('dragging')
  })

  it('treats dragging as the strongest state, selected or not', () => {
    expect(elevationFor({ isSelected: false, isDragging: true })).toBe('dragging')
  })
})

describe('the shadows themselves', () => {
  it('covers every elevation in both forms', () => {
    for (const elevation of ELEVATIONS) {
      expect(boxShadowClass(elevation)).toBeTruthy()
      expect(dropShadowFilter(elevation)).toMatch(/^drop-shadow\(/)
    }
  })

  it('deepens as an element lifts', () => {
    // More blur at each step, so picking something up reads as picking it up.
    // drop-shadow(0 <y>px <blur>px rgba(...))
    const blur = (elevation: (typeof ELEVATIONS)[number]) =>
      Number(dropShadowFilter(elevation).match(/0 \d+px (\d+)px/)![1])

    expect(blur('selected')).toBeGreaterThan(blur('resting'))
    expect(blur('dragging')).toBeGreaterThan(blur('selected'))
  })

  it('keeps notes on the tailwind scale they already use', () => {
    expect(boxShadowClass('resting')).toContain('shadow-md')
    expect(boxShadowClass('selected')).toContain('shadow-xl')
  })
})
