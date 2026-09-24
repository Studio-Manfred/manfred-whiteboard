import { describe, it, expect } from 'vitest'
import {
  FILL_PATTERNS,
  patternFill,
  patternIdFor,
  patternLabel,
  patternTile,
  type FillPattern,
  type PatternTile,
} from '../src/lib/fill-patterns'
import type { ShapeElement } from '../src/types/whiteboard'

const shape = {
  id: 's', type: 'shape', shapeType: 'rectangle', x: 0, y: 0, width: 120, height: 100,
  zIndex: 1, fillColor: '#CCE2FF', strokeColor: '#0f172a', strokeWidth: 2,
  createdAt: 0, updatedAt: 0,
} as ShapeElement

/**
 * A shape carrying the one new field the feature adds. The cast is what lets
 * these tests describe the field before it exists on the type.
 */
function patterned(pattern: FillPattern, overrides: Partial<ShapeElement> = {}): ShapeElement {
  return { ...shape, ...overrides, pattern } as ShapeElement
}

/** Every number in a path, the way ink.test.ts reads one. */
function numbersIn(d: string): number[] {
  return Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g)).map((m) => Number(m[0]))
}

/** A tile as a string, so two of them can be compared for sameness. */
function serialise(tile: PatternTile): string {
  return JSON.stringify(tile)
}

describe('FILL_PATTERNS', () => {
  it('offers the five patterns, in the order the picker shows them', () => {
    expect([...FILL_PATTERNS]).toEqual([
      'hatch',
      'crosshatch',
      'dots',
      'checker',
      'scanline',
    ])
  })

  it('lists each pattern once', () => {
    expect(new Set(FILL_PATTERNS).size).toBe(FILL_PATTERNS.length)
  })
})

describe('patternTile', () => {
  it('gives every pattern a tile that can actually be drawn', () => {
    for (const pattern of FILL_PATTERNS) {
      const tile = patternTile(pattern)

      expect(tile.size).toBeGreaterThan(0)
      expect(tile.strokeWidth).toBeGreaterThan(0)
      expect(tile.marks.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('says of every mark whether it is a line or a solid', () => {
    for (const pattern of FILL_PATTERNS) {
      for (const mark of patternTile(pattern).marks) {
        expect(['stroke', 'fill']).toContain(mark.kind)
      }
    }
  })

  it('starts every mark at an absolute move, so its numbers are tile coordinates', () => {
    // Relative commands would make the numbers offsets rather than positions,
    // and the containment check below could no longer read them.
    const wrong = FILL_PATTERNS.flatMap((pattern) =>
      patternTile(pattern)
        .marks.filter((mark) => !/^M[\s-\d]/.test(mark.d.trim()) || /[mlhvcsqtaz]/.test(mark.d))
        .map((mark) => `${pattern}: ${mark.d}`)
    )

    expect(wrong).toEqual([])
  })

  it('keeps every mark inside its tile, so the fill does not seam where it repeats', () => {
    const strays = FILL_PATTERNS.flatMap((pattern) => {
      const tile = patternTile(pattern)

      return tile.marks.flatMap((mark) =>
        numbersIn(mark.d)
          .filter((value) => value < -tile.strokeWidth || value > tile.size + tile.strokeWidth)
          .map((value) => `${pattern}: ${value} outside 0…${tile.size}`)
      )
    })

    expect(strays).toEqual([])
  })

  it('draws no two patterns the same, so none collapses into another in greyscale', () => {
    const tiles = FILL_PATTERNS.map((pattern) => serialise(patternTile(pattern)))

    expect(new Set(tiles).size).toBe(FILL_PATTERNS.length)
  })

  it('varies the shape of the mark, not only how dense it is', () => {
    const kinds = new Set(
      FILL_PATTERNS.flatMap((pattern) => patternTile(pattern).marks.map((mark) => mark.kind))
    )

    expect(kinds).toContain('stroke')
    expect(kinds).toContain('fill')
  })

  it('is deterministic, so the canvas and the export draw the same tile', () => {
    for (const pattern of FILL_PATTERNS) {
      expect(serialise(patternTile(pattern))).toBe(serialise(patternTile(pattern)))
    }
  })

  it('never emits NaN', () => {
    for (const pattern of FILL_PATTERNS) {
      for (const mark of patternTile(pattern).marks) {
        expect(mark.d).not.toContain('NaN')
      }
    }
  })
})

describe('patternIdFor', () => {
  it('names a def after the element it belongs to', () => {
    expect(patternIdFor('abc')).toBe('pattern-abc')
  })

  it('gives two elements two ids, so axe never sees a duplicate', () => {
    expect(patternIdFor('a')).not.toBe(patternIdFor('b'))
  })

  it('is deterministic, so the fill and the def agree on every peer', () => {
    expect(patternIdFor('abc')).toBe(patternIdFor('abc'))
  })
})

describe('patternFill', () => {
  it('points a patterned shape at its own def', () => {
    expect(patternFill(patterned('hatch'))).toBe(`url(#${patternIdFor('s')})`)
    expect(patternFill(patterned('hatch'))).toBe('url(#pattern-s)')
  })

  it('leaves a shape with no pattern on its plain fill colour', () => {
    // Boards drawn before patterns existed have to render byte for byte as they did.
    expect(patternFill(shape)).toBe('#CCE2FF')
  })

  it('falls back to transparent when there is no fill colour either', () => {
    // The same fallback ShapeItem has always used.
    expect(patternFill({ ...shape, fillColor: '' } as ShapeElement)).toBe('transparent')
  })

  it('falls back to a solid fill for a pattern it does not know', () => {
    // Boards sync over Yjs between clients on different versions, so a newer
    // peer's pattern must not blank the shape or throw.
    const future = patterned('mosaic' as FillPattern)

    expect(() => patternFill(future)).not.toThrow()
    expect(patternFill(future)).toBe('#CCE2FF')
  })
})

describe('patternLabel', () => {
  it('names every pattern', () => {
    for (const pattern of FILL_PATTERNS) {
      expect(patternLabel(pattern).trim()).not.toBe('')
    }
  })

  it('gives each pattern its own name, so the picker reads unambiguously', () => {
    const labels = FILL_PATTERNS.map((pattern) => patternLabel(pattern))

    expect(new Set(labels).size).toBe(FILL_PATTERNS.length)
  })

  it('has something to say about a pattern it does not know', () => {
    expect(() => patternLabel('mosaic' as FillPattern)).not.toThrow()
  })
})
