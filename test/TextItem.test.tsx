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

  it('deletes a never-committed blank object on Escape instead of just exiting edit mode', () => {
    // Round 2 review, Important: the third ghost path. A brand-new object
    // (committed text still '') has nothing to abandon *back to* — it exists
    // only because the creating click made it, so Escape has to abandon the
    // creation too, or it becomes a third way to leave a blank, invisible,
    // hit-testable ghost on the board. This is the mirror of the test above:
    // that one proves Escape restores and keeps an object with real
    // committed text; this one proves it deletes one with none — whatever
    // was typed in the meantime included, since none of it was ever
    // committed either.
    const onUpdate = vi.fn()
    const blank: TextElement = { ...text, text: '' }
    // startEditing mirrors what App.tsx passes for the element it just
    // created locally (STU-953 critical fix) — this ghost path only exists
    // in the creating tab, never a remote peer's.
    render(<TextItem element={blank} {...props} onUpdate={onUpdate} startEditing />)
    const box = screen.getByRole('textbox')
    fireEvent.change(box, { target: { value: 'typed but never blurred' } })
    fireEvent.keyDown(box, { key: 'Escape' })

    expect(onUpdate).toHaveBeenCalledWith({ text: '' })
  })

  // STU-972: a text object is an arrow endpoint, so it carries the same four
  // anchors a sticky note does. Assertions deliberately mirror
  // StickyNote.test.tsx rather than inventing a second vocabulary — the
  // accessible name is what a screen-reader user hears on either element, and
  // two spellings of it would be the bug.
  it('offers a labelled connection anchor on each side', () => {
    const onAnchorDragStart = vi.fn()
    render(<TextItem element={text} {...props} onAnchorDragStart={onAnchorDragStart} />)

    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(
        screen.getByRole('button', { name: `Connect from ${side} anchor` })
      ).toBeInTheDocument()
    }

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Connect from bottom anchor' }))
    expect(onAnchorDragStart).toHaveBeenCalledWith('bottom', expect.anything())
  })

  it('offers a keyboard route, since a drag is pointer-only', () => {
    // WCAG 2.1.1: drawing an arrow cannot be the only way to connect, or a
    // keyboard-only user can never make one.
    const onAnchorKeyActivate = vi.fn()
    render(<TextItem element={text} {...props} onAnchorKeyActivate={onAnchorKeyActivate} />)
    const anchor = screen.getByRole('button', { name: 'Connect from left anchor' })

    // detail 0 is how a browser reports Enter or Space on a button
    fireEvent.click(anchor, { detail: 0 })
    expect(onAnchorKeyActivate).toHaveBeenCalledWith('left')

    // a real mouse click carries detail >= 1 and must not double-fire
    onAnchorKeyActivate.mockClear()
    fireEvent.click(anchor, { detail: 1 })
    expect(onAnchorKeyActivate).not.toHaveBeenCalled()
  })

  it('does not select or drag the text object when an anchor is pressed', () => {
    // Fresh mocks, not the shared `props` ones: pointerdown on the box itself
    // selects and starts a drag, so an anchor that lets the event through
    // moves the text instead of drawing an arrow.
    const onSelect = vi.fn()
    const onDragStart = vi.fn()
    render(
      <TextItem
        element={text}
        isSelected={false}
        onSelect={onSelect}
        onUpdate={vi.fn()}
        onDragStart={onDragStart}
        onAnchorDragStart={vi.fn()}
      />
    )

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Connect from right anchor' }))

    expect(onSelect).not.toHaveBeenCalled()
    expect(onDragStart).not.toHaveBeenCalled()
  })

  it('shows its anchors on demand and marks the one an arrow would land on', () => {
    render(
      <TextItem element={text} {...props} showAnchors highlightedAnchor="right" />
    )

    expect(screen.getByRole('button', { name: 'Connect from top anchor' }).className).toContain(
      'opacity-100'
    )
    expect(screen.getByRole('button', { name: 'Connect from right anchor' })).toHaveAttribute(
      'data-snap-target',
      'true'
    )
    expect(
      screen.getByRole('button', { name: 'Connect from top anchor' })
    ).not.toHaveAttribute('data-snap-target')
  })

  // STU-972 ruling (not in the original design): the design assumed anchors
  // sitting outside the box would not fight the textarea; rather than verify
  // that assumption, it was dropped — while typing, you are not connecting.
  // The four anchor tests above all render non-editing, so this pair is the
  // only permanent guard on the edit-mode side of that ruling.
  it('presents all four anchors when not editing', () => {
    render(<TextItem element={text} {...props} />)

    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(
        screen.queryByRole('button', { name: `Connect from ${side} anchor` })
      ).toBeInTheDocument()
    }
  })

  it('presents no anchors while the object is being edited', () => {
    render(<TextItem element={text} {...props} startEditing />)

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    // Absent from the document, not merely hidden — the real-browser check
    // confirmed this is what the component actually does (the anchor block
    // is gated with `&&`, not an opacity/visibility class), so this asserts
    // absence rather than a CSS visibility property.
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(
        screen.queryByRole('button', { name: `Connect from ${side} anchor` })
      ).not.toBeInTheDocument()
    }
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
