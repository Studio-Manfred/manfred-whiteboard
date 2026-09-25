import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TextItem } from '../src/components/Canvas/TextItem'
import type { TextElement } from '../src/types/whiteboard'
import { LINE_HEIGHT, type Measure } from '../src/lib/text-layout'

const text: TextElement = {
  id: 'x1', type: 'text', x: 0, y: 0, width: 100, height: 27,
  zIndex: 1, createdAt: 0, updatedAt: 0, text: 'hello', fontSize: 20,
}

const props = {
  isSelected: false,
  onSelect: vi.fn(),
  onUpdate: vi.fn(),
  onDragStart: vi.fn(),
}

describe('TextItem', () => {
  it('renders one element per laid-out line', () => {
    render(<TextItem element={{ ...text, text: 'hello world', width: 60 }} {...props} />)
    // jsdom cannot measure, so the estimate measurer runs — assert on the
    // count rather than on where exactly it broke.
    expect(screen.getAllByTestId('text-line').length).toBeGreaterThan(1)
  })

  it('writes the height back when the laid-out height differs', () => {
    const onUpdate = vi.fn()
    render(<TextItem element={{ ...text, height: 999 }} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ height: expect.any(Number) }))
    expect(onUpdate.mock.calls[0][0].height).not.toBe(999)
  })

  it('stays silent on mount when the stored height already agrees', () => {
    // Round 1 review: the previous version of this test re-rendered with the
    // same element and the same onUpdate, so the dependency array never
    // changed and React never re-ran the effect at all — it proved React's
    // semantics, not the guard. A mutation deleting `Math.abs(...) > 0.5`
    // still passed it. This fixture's height (27) already equals what
    // 'hello' at fontSize 20 lays out to, so a correct guard stays silent on
    // the very first render, and a missing one fires on mount.
    const onUpdate = vi.fn()
    render(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('recomputes the height when the font size changes', () => {
    // Review Focus 3: a stale height makes hit-testing lie.
    const onUpdate = vi.fn()
    const { rerender } = render(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    onUpdate.mockClear()
    rerender(<TextItem element={{ ...text, fontSize: 40 }} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ height: expect.any(Number) }))
  })

  it('corrects a stale height that arrives mid-session from a peer', () => {
    // Round 1 review: a fresh mount with a wrong height never distinguishes
    // "corrects on mount" from "corrects mid-session" — dropping
    // element.height from the effect's dependencies (so it would never react
    // to a later peer update) also passed the old version of this test. The
    // rerender with a *different* element object is what forces the effect
    // to run again after mount, the way a real peer patch would.
    const onUpdate = vi.fn()
    const { rerender } = render(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    onUpdate.mockClear()
    rerender(<TextItem element={{ ...text, height: 4 }} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).toHaveBeenCalledWith({ height: 27 })
  })

  it('patches a non-zero height for empty text, matching what it draws', () => {
    // Round 1 review, Important: the component drew
    // Math.max(layout.height, fontSize * LINE_HEIGHT) but patched
    // layout.height alone. For any non-empty text the Math.max is a no-op,
    // so this only bites empty text — which draws a visible, clickable box
    // (so you can click into an empty text object to type into it) while
    // storing height 0, a document that thinks the box doesn't exist.
    // Hit-testing, marquee selection and export bounds would all miss it.
    const onUpdate = vi.fn()
    const empty: TextElement = { ...text, text: '', height: 0 }
    const expectedHeight = empty.fontSize * LINE_HEIGHT

    render(<TextItem element={empty} {...props} onUpdate={onUpdate} />)

    expect(onUpdate).toHaveBeenCalledWith({ height: expectedHeight })
    expect(screen.getByTestId(`text-${empty.id}`)).toHaveStyle({
      height: `${expectedHeight}px`,
    })
  })

  it('renders textColor when set, and slate-800 when not', () => {
    const { rerender } = render(<TextItem element={text} {...props} />)
    expect(screen.getByTestId('text-body')).toHaveStyle({ color: 'rgb(30, 41, 59)' })

    rerender(<TextItem element={{ ...text, textColor: '#dc2626' }} {...props} />)
    expect(screen.getByTestId('text-body')).toHaveStyle({ color: '#dc2626' })
  })

  it('honours an explicit text alignment, not just the left default', () => {
    // This is the assertion that would have caught effectiveTextAlign
    // returning null for text: supportsProperty(el, 'align') advertised a
    // control that effectiveTextAlign silently ignored.
    render(<TextItem element={{ ...text, textAlign: 'center' }} {...props} />)
    expect(screen.getByTestId('text-body')).toHaveStyle({ textAlign: 'center' })
  })

  it('offers only the east and west resize handles', () => {
    render(<TextItem element={text} {...props} isSelected onResizeStart={vi.fn()} onResizeByKeyboard={vi.fn()} />)
    expect(screen.getByRole('button', { name: /right edge/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /left edge/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /bottom edge/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /corner/i })).not.toBeInTheDocument()
  })

  it('opens a textarea on double click and commits on blur', () => {
    const onUpdate = vi.fn()
    render(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    fireEvent.doubleClick(screen.getByTestId('text-body'))

    const box = screen.getByRole('textbox')
    fireEvent.change(box, { target: { value: 'changed' } })
    fireEvent.blur(box)

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ text: 'changed' }))
  })

  it('abandons the edit on Escape without writing back', () => {
    // Round 1 review, Important ruling: Escape abandons rather than commits
    // — matching StickyNote and what Escape means in a text field. Enter is
    // deliberately untouched, so the textarea's own newline-insertion stays.
    const onUpdate = vi.fn()
    render(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    fireEvent.doubleClick(screen.getByTestId('text-body'))

    const box = screen.getByRole('textbox')
    fireEvent.change(box, { target: { value: 'changed' } })
    fireEvent.keyDown(box, { key: 'Escape' })

    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.getByTestId('text-body')).toHaveTextContent('hello')
  })

  it('recomputes layout when the font family changes, via an injected measurer', () => {
    // Round 1 review, Accepted (measurer injectability): jsdom's real canvas
    // is unavailable, so the default fallback (an average-glyph estimate)
    // never varies by font family — no test could previously distinguish
    // "recomputed for the new family" from "recomputed but got the same
    // wrapping anyway". A measurer that actually differs by family, injected
    // through the new `measure` prop, makes that provable.
    const varyByFamily: Measure = (line, font) =>
      font.includes('monospace') ? line.length * 20 : line.length * 5

    const wide = { ...text, text: 'hello world', width: 60 }
    const { rerender } = render(<TextItem element={wide} {...props} measure={varyByFamily} />)
    const sansLineCount = screen.getAllByTestId('text-line').length

    rerender(
      <TextItem element={{ ...wide, fontFamily: 'mono' }} {...props} measure={varyByFamily} />
    )
    const monoLineCount = screen.getAllByTestId('text-line').length

    expect(monoLineCount).not.toBe(sansLineCount)
  })
})
