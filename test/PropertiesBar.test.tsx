import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { PropertiesBar } from '../src/components/UI/PropertiesBar'
import { FILL_SWATCHES } from '../src/lib/element-colors'
import { FILL_PATTERNS, patternLabel, patternTile } from '../src/lib/fill-patterns'
import type { BoardElement, ConnectorElement, ShapeElement, StickyElement } from '../src/types/whiteboard'

const note: StickyElement = {
  id: 'n', type: 'sticky', x: 0, y: 0, width: 200, height: 200, zIndex: 1,
  text: '', color: '#FFF9B1', fontSize: 16, createdAt: 0, updatedAt: 0,
}

const shape: ShapeElement = {
  id: 's', type: 'shape', shapeType: 'rectangle', x: 0, y: 0, width: 120, height: 100,
  zIndex: 1, fillColor: '#CCE2FF', strokeColor: '#0f172a', strokeWidth: 2,
  createdAt: 0, updatedAt: 0,
}

const arrow: ConnectorElement = {
  id: 'c', type: 'connector', fromId: 'n', toId: 's', fromAnchor: 'right', toAnchor: 'left',
  x: 0, y: 0, width: 0, height: 0, zIndex: 1, strokeColor: '#475569', strokeWidth: 2,
  style: 'curved', createdAt: 0, updatedAt: 0,
}

const ink: BoardElement = {
  id: 'd', type: 'drawing', x: 0, y: 0, width: 50, height: 50, zIndex: 1,
  points: [], strokeColor: '#ef4444', strokeWidth: 3, createdAt: 0, updatedAt: 0,
}

function renderBar(selection: BoardElement[]) {
  const handlers = {
    onFillChange: vi.fn(),
    onStrokeColorChange: vi.fn(),
    onThicknessChange: vi.fn(),
    onFontSizeChange: vi.fn(),
    onFontFamilyChange: vi.fn(),
    onArrowheadsChange: vi.fn(),
    onStackChange: vi.fn(),
    onTextAlignChange: vi.fn(),
    onPatternChange: vi.fn(),
  }
  render(
    <PropertiesBar
      selection={selection}
      bounds={{ x: 200, y: 300, width: 200, height: 200 }}
      viewport={{ x: 0, y: 0, zoom: 1 }}
      {...handlers}
    />
  )
  return handlers
}

const control = (name: string) => screen.queryByRole('button', { name })

describe('PropertiesBar', () => {
  it('is a labelled toolbar, placed beside the selection', () => {
    renderBar([note])
    const bar = screen.getByRole('toolbar', { name: 'Selection properties' })

    expect(bar).toHaveAttribute('data-placement', 'above')
    // 300 down, less the bar and the gap.
    expect(bar.style.top).toBe('244px')
  })

  it('flips below a selection with no room above it', () => {
    render(
      <PropertiesBar
        selection={[note]}
        bounds={{ x: 200, y: 4, width: 200, height: 200 }}
        viewport={{ x: 0, y: 0, zoom: 1 }}
        onFillChange={vi.fn()}
        onStrokeColorChange={vi.fn()}
        onThicknessChange={vi.fn()}
        onFontSizeChange={vi.fn()}
        onFontFamilyChange={vi.fn()}
        onArrowheadsChange={vi.fn()}
        onStackChange={vi.fn()}
        onTextAlignChange={vi.fn()}
        onPatternChange={vi.fn()}
      />
    )

    expect(screen.getByRole('toolbar', { name: 'Selection properties' })).toHaveAttribute(
      'data-placement',
      'below'
    )
  })

  it('offers a note fill and text controls, but no border', () => {
    renderBar([note])

    expect(control('Fill colour')).toBeInTheDocument()
    expect(control('Text size')).toBeInTheDocument()
    expect(control('Font')).toBeInTheDocument()
    expect(control('Border colour')).not.toBeInTheDocument()
    expect(control('Arrowheads')).not.toBeInTheDocument()
  })

  it('offers a shape its border and thickness as well', () => {
    renderBar([shape])

    expect(control('Fill colour')).toBeInTheDocument()
    expect(control('Border colour')).toBeInTheDocument()
    expect(control('Thickness')).toBeInTheDocument()
  })

  it('offers an arrow its line, thickness and arrowheads only', () => {
    renderBar([arrow])

    expect(control('Line colour')).toBeInTheDocument()
    expect(control('Thickness')).toBeInTheDocument()
    expect(control('Arrowheads')).toBeInTheDocument()
    expect(control('Fill colour')).not.toBeInTheDocument()
    expect(control('Text size')).not.toBeInTheDocument()
  })

  it('offers ink a colour and a thickness', () => {
    renderBar([ink])

    expect(control('Line colour')).toBeInTheDocument()
    expect(control('Thickness')).toBeInTheDocument()
    expect(control('Arrowheads')).not.toBeInTheDocument()
  })

  it('offers the union of what a mixed selection supports', () => {
    renderBar([note, arrow])

    expect(control('Fill colour')).toBeInTheDocument()
    expect(control('Arrowheads')).toBeInTheDocument()
  })

  it('is a single tab stop', () => {
    renderBar([shape])
    const tabbable = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('tabindex') === '0')

    expect(tabbable).toHaveLength(1)
  })

  it('moves between controls with the arrow keys', () => {
    renderBar([shape])
    const fill = control('Fill colour')!
    fill.focus()

    fireEvent.keyDown(fill, { key: 'ArrowRight' })

    expect(control('Border colour')).toHaveFocus()
  })

  it('changes the fill from the palette', () => {
    const handlers = renderBar([note])

    fireEvent.click(control('Fill colour')!)
    fireEvent.click(screen.getByRole('button', { name: 'Lavender' }))

    expect(handlers.onFillChange).toHaveBeenCalledWith('#E8D7FF')
  })

  it('changes the border colour', () => {
    const handlers = renderBar([shape])

    fireEvent.click(control('Border colour')!)
    fireEvent.click(screen.getByRole('button', { name: 'Red' }))

    expect(handlers.onStrokeColorChange).toHaveBeenCalledWith('#dc2626')
  })

  it('changes thickness', () => {
    const handlers = renderBar([arrow])

    fireEvent.click(control('Thickness')!)
    fireEvent.click(screen.getByRole('button', { name: '8 px' }))

    expect(handlers.onThicknessChange).toHaveBeenCalledWith(8)
  })

  it('changes text size and font', () => {
    const handlers = renderBar([note])

    fireEvent.click(control('Text size')!)
    fireEvent.click(screen.getByRole('button', { name: '24 px' }))
    expect(handlers.onFontSizeChange).toHaveBeenCalledWith(24)

    fireEvent.click(control('Font')!)
    fireEvent.click(screen.getByRole('button', { name: 'Serif' }))
    expect(handlers.onFontFamilyChange).toHaveBeenCalledWith('serif')
  })

  it('changes arrowheads', () => {
    const handlers = renderBar([arrow])

    fireEvent.click(control('Arrowheads')!)
    fireEvent.click(screen.getByRole('button', { name: 'Arrowheads at both ends' }))

    expect(handlers.onArrowheadsChange).toHaveBeenCalledWith('both')
  })

  it('marks the values the selection currently has', () => {
    renderBar([arrow])

    fireEvent.click(control('Thickness')!)
    expect(screen.getByRole('button', { name: '2 px' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.click(control('Arrowheads')!)
    // An arrow saved before the fields existed reads as end-only.
    expect(screen.getByRole('button', { name: 'Arrowhead at the end' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('marks nothing when the selection disagrees', () => {
    renderBar([arrow, { ...ink, strokeWidth: 8 }])

    fireEvent.click(control('Thickness')!)

    expect(screen.getByRole('button', { name: '2 px' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '8 px' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('closes a panel and restores focus on Escape', () => {
    renderBar([note])
    const trigger = control('Fill colour')!

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Fill colour' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
  it('offers stack order for notes and shapes only', () => {
    renderBar([note])
    expect(control('Stack order')).toBeInTheDocument()
  })

  it('offers no stack order for an arrow, which sits on its own layer', () => {
    renderBar([arrow])
    expect(control('Stack order')).not.toBeInTheDocument()
  })

  it('reports each stacking command', () => {
    const handlers = renderBar([shape])

    for (const [label, command] of [
      ['Bring to front', 'front'],
      ['Bring forward', 'forward'],
      ['Send backward', 'backward'],
      ['Send to back', 'back'],
    ] as const) {
      fireEvent.click(control('Stack order')!)
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(handlers.onStackChange).toHaveBeenCalledWith(command)
    }
  })
  it('offers alignment wherever there is text', () => {
    renderBar([note])
    expect(control('Text alignment')).toBeInTheDocument()

    cleanup()
    renderBar([arrow])
    expect(control('Text alignment')).not.toBeInTheDocument()
  })

  it('reports each alignment', () => {
    const handlers = renderBar([note])

    for (const [label, align] of [
      ['Align left', 'left'],
      ['Align centre', 'center'],
      ['Align right', 'right'],
    ] as const) {
      fireEvent.click(control('Text alignment')!)
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(handlers.onTextAlignChange).toHaveBeenCalledWith(align)
    }
  })

  it('marks how the selection is aligned today', () => {
    renderBar([note])

    fireEvent.click(control('Text alignment')!)

    // A note with no alignment set has always been left-aligned.
    expect(screen.getByRole('button', { name: 'Align left' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('marks nothing when a mixed selection disagrees', () => {
    // A note defaults to left and a shape label to centre.
    renderBar([note, shape])

    fireEvent.click(control('Text alignment')!)

    expect(screen.getByRole('button', { name: 'Align left' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByRole('button', { name: 'Align centre' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  describe('fill patterns', () => {
    /**
     * The chip that clears the pattern, named the way the fill palette names
     * its empty swatch ("No fill") rather than with a bare "None".
     */
    const NO_PATTERN = 'No pattern'

    /** Every chip's accessible name, in the order the row must show them. */
    const CHIP_NAMES = [NO_PATTERN, ...FILL_PATTERNS.map(patternLabel)]

    /** The patterns live in a second row of the fill panel, not on the bar. */
    const openFillPanel = () => {
      fireEvent.click(control('Fill colour')!)
      return screen.getByRole('dialog', { name: 'Fill colour' })
    }

    it('costs the bar no button of its own, so it still fits a phone', () => {
      renderBar([shape])

      // Fill, border, thickness, text size, font, stack order, alignment.
      expect(screen.getAllByRole('button')).toHaveLength(7)
      expect(control('Fill pattern')).not.toBeInTheDocument()
      expect(control('Pattern')).not.toBeInTheDocument()
    })

    it('offers the chips in the fill panel when a shape is selected', () => {
      renderBar([shape])
      const panel = openFillPanel()

      for (const name of CHIP_NAMES) {
        expect(within(panel).getByRole('button', { name })).toBeInTheDocument()
      }
    })

    it('offers a note its colours and nothing else — a note has no pattern', () => {
      renderBar([note])
      const panel = openFillPanel()

      for (const name of CHIP_NAMES) {
        expect(within(panel).queryByRole('button', { name })).not.toBeInTheDocument()
      }
      // The swatches are untouched.
      expect(within(panel).getByRole('button', { name: 'Lavender' })).toBeInTheDocument()
    })

    it('shows six chips — none first, then the five in picker order', () => {
      renderBar([shape])
      const panel = openFillPanel()

      expect(CHIP_NAMES).toHaveLength(6)

      const buttons = within(panel).getAllByRole('button')
      const positions = CHIP_NAMES.map((name) =>
        buttons.indexOf(within(panel).getByRole('button', { name }))
      )

      expect(positions).toEqual([...positions].sort((a, b) => a - b))
      // The swatches plus these six, and no stray seventh chip.
      expect(buttons).toHaveLength(FILL_SWATCHES.length + CHIP_NAMES.length)
    })

    it('draws each chip from the tile the canvas draws', () => {
      // A chip built from its own geometry could advertise a fill the shape
      // will never paint — the bug this bar has already had with colour.
      renderBar([shape])
      openFillPanel()

      for (const pattern of FILL_PATTERNS) {
        const chip = screen.getByRole('button', { name: patternLabel(pattern) })
        const drawn = Array.from(chip.querySelectorAll('path')).map((p) => p.getAttribute('d'))

        for (const mark of patternTile(pattern).marks) {
          expect(drawn).toContain(mark.d)
        }
      }
    })

    it('tiles each chip, so it reads as the texture and not one stray mark', () => {
      // Drawing a tile's marks once shows a single dot for Ben-Day dots and two
      // offset squares for a checkerboard — correct geometry that tells the
      // human nothing. The chip has to repeat the tile the way the shape does.
      renderBar([shape])
      openFillPanel()

      for (const pattern of FILL_PATTERNS) {
        const chip = screen.getByRole('button', { name: patternLabel(pattern) })

        expect(chip.querySelector('pattern')).not.toBeNull()
        expect(chip.querySelector('rect[fill^="url(#"]')).not.toBeNull()
      }
    })

    it('applies the pattern that was chosen', () => {
      const handlers = renderBar([shape])

      openFillPanel()
      fireEvent.click(screen.getByRole('button', { name: patternLabel('dots') }))

      expect(handlers.onPatternChange).toHaveBeenCalledWith('dots')
    })

    it('clears the pattern back to a solid fill', () => {
      const handlers = renderBar([{ ...shape, pattern: 'hatch' }])

      openFillPanel()
      fireEvent.click(screen.getByRole('button', { name: NO_PATTERN }))

      expect(handlers.onPatternChange).toHaveBeenCalledWith(undefined)
    })

    it('leaves the fill colour alone when only the pattern changed', () => {
      // Both rows share one panel; a chip must not repaint the shape as well.
      const handlers = renderBar([shape])

      openFillPanel()
      fireEvent.click(screen.getByRole('button', { name: patternLabel('crosshatch') }))

      expect(handlers.onFillChange).not.toHaveBeenCalled()
    })

    it('leaves the pattern alone when only the colour changed', () => {
      const handlers = renderBar([shape])

      openFillPanel()
      fireEvent.click(screen.getByRole('button', { name: 'Lavender' }))

      expect(handlers.onFillChange).toHaveBeenCalledWith('#E8D7FF')
      expect(handlers.onPatternChange).not.toHaveBeenCalled()
    })

    it('closes the panel and hands focus back when a chip is chosen', () => {
      renderBar([shape])
      const trigger = control('Fill colour')!

      openFillPanel()
      fireEvent.click(screen.getByRole('button', { name: patternLabel('scanline') }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()
    })

    it('marks the pattern the shape already has', () => {
      renderBar([{ ...shape, pattern: 'checker' }])
      openFillPanel()

      expect(screen.getByRole('button', { name: patternLabel('checker') })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      expect(screen.getByRole('button', { name: NO_PATTERN })).toHaveAttribute(
        'aria-pressed',
        'false'
      )
    })

    it('marks none for a shape drawn before patterns existed', () => {
      renderBar([shape])
      openFillPanel()

      expect(screen.getByRole('button', { name: NO_PATTERN })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      expect(screen.getByRole('button', { name: patternLabel('hatch') })).toHaveAttribute(
        'aria-pressed',
        'false'
      )
    })

    it('marks nothing when two shapes carry different patterns', () => {
      renderBar([
        { ...shape, pattern: 'hatch' },
        { ...shape, id: 's2', pattern: 'dots' },
      ])
      openFillPanel()

      for (const name of [NO_PATTERN, patternLabel('hatch'), patternLabel('dots')]) {
        expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
      }
    })

    it('marks nothing when one shape is patterned and the other is plain', () => {
      // sharedValue drops undefined, so a plain shape falls out of the
      // comparison and the bar would otherwise claim a pattern only one of
      // them has.
      renderBar([{ ...shape, pattern: 'hatch' }, { ...shape, id: 's2' }])
      openFillPanel()

      expect(screen.getByRole('button', { name: patternLabel('hatch') })).toHaveAttribute(
        'aria-pressed',
        'false'
      )
      expect(screen.getByRole('button', { name: NO_PATTERN })).toHaveAttribute(
        'aria-pressed',
        'false'
      )
    })

    it('gives a mixed note-and-shape selection the chips, as the bar does elsewhere', () => {
      renderBar([note, shape])
      const panel = openFillPanel()

      expect(within(panel).getByRole('button', { name: patternLabel('hatch') })).toBeInTheDocument()
    })

    it('makes every chip a real button, reachable and operable from the keyboard', () => {
      // jsdom does not turn Enter on a button into a click, so the contract is
      // asserted on the element itself: a native button, in the tab order.
      renderBar([shape])
      const panel = openFillPanel()

      for (const name of CHIP_NAMES) {
        const chip = within(panel).getByRole('button', { name })

        expect(chip.tagName).toBe('BUTTON')
        expect(chip).toHaveAttribute('type', 'button')
        expect(chip).not.toHaveAttribute('tabindex', '-1')
      }
    })

    it('keeps the bar a single tab stop while the chips are open', () => {
      renderBar([shape])
      const bar = screen.getByRole('toolbar', { name: 'Selection properties' })
      openFillPanel()

      const tabbable = within(bar)
        .getAllByRole('button')
        .filter((b) => b.getAttribute('tabindex') === '0')

      expect(tabbable).toHaveLength(1)
    })

    it('closes the chips on Escape and restores focus, like every other panel', () => {
      renderBar([shape])
      const trigger = control('Fill colour')!

      openFillPanel()
      expect(screen.getByRole('button', { name: NO_PATTERN })).toBeInTheDocument()

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()
    })
  })
})
