import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PropertiesBar } from '../src/components/UI/PropertiesBar'
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
})
