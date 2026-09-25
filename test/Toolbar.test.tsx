import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Toolbar } from '../src/components/UI/Toolbar'

describe('Toolbar', () => {
  it('exposes a single toolbar with an accessible name', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)

    expect(screen.getByRole('toolbar', { name: 'Drawing tools' })).toBeInTheDocument()
  })

  it('marks the active tool as pressed', () => {
    render(<Toolbar activeTool="pen" onToolChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Pen' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('is a single tab stop — only the active tool is tabbable (roving tabindex)', () => {
    render(<Toolbar activeTool="pen" onToolChange={vi.fn()} />)

    const buttons = screen.getAllByRole('button')
    const tabbable = buttons.filter((b) => b.getAttribute('tabindex') === '0')

    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toHaveAccessibleName('Pen')
    buttons
      .filter((b) => b !== tabbable[0])
      .forEach((b) => expect(b).toHaveAttribute('tabindex', '-1'))
  })

  it('moves focus with ArrowRight / ArrowLeft', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)

    const select = screen.getByRole('button', { name: 'Select' })
    const pan = screen.getByRole('button', { name: 'Pan' })
    select.focus()

    fireEvent.keyDown(select, { key: 'ArrowRight' })
    expect(pan).toHaveFocus()

    fireEvent.keyDown(pan, { key: 'ArrowLeft' })
    expect(select).toHaveFocus()
  })

  it('wraps focus around both ends', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)

    const select = screen.getByRole('button', { name: 'Select' })
    const eraser = screen.getByRole('button', { name: 'Eraser' })

    select.focus()
    fireEvent.keyDown(select, { key: 'ArrowLeft' })
    expect(eraser).toHaveFocus()

    fireEvent.keyDown(eraser, { key: 'ArrowRight' })
    expect(select).toHaveFocus()
  })

  it('jumps to the first and last tool with Home / End', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)

    const select = screen.getByRole('button', { name: 'Select' })
    const eraser = screen.getByRole('button', { name: 'Eraser' })

    select.focus()
    fireEvent.keyDown(select, { key: 'End' })
    expect(eraser).toHaveFocus()

    fireEvent.keyDown(eraser, { key: 'Home' })
    expect(select).toHaveFocus()
  })

  it('selects a tool on click', () => {
    const onToolChange = vi.fn()
    render(<Toolbar activeTool="select" onToolChange={onToolChange} />)

    // Rectangle/Circle moved behind the Shape flyout (see "the shape group"
    // below) — this checks plain click-to-select on a tool that is still a
    // direct toolbar button.
    fireEvent.click(screen.getByRole('button', { name: 'Sticky note' }))

    expect(onToolChange).toHaveBeenCalledWith('sticky')
  })

  it('does not change the tool merely by moving focus', () => {
    const onToolChange = vi.fn()
    render(<Toolbar activeTool="select" onToolChange={onToolChange} />)

    const select = screen.getByRole('button', { name: 'Select' })
    select.focus()
    fireEvent.keyDown(select, { key: 'ArrowRight' })

    expect(onToolChange).not.toHaveBeenCalled()
  })

  it('keeps a single tab stop', () => {
    render(<Toolbar activeTool="pen" onToolChange={vi.fn()} />)

    const tabbable = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('tabindex') === '0')

    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toHaveAccessibleName('Pen')
  })

})

describe('the shape group', () => {
  it('shows one Shape button rather than two shape tools', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Shape' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rectangle' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Circle' })).not.toBeInTheDocument()
  })

  it('opens a flyout holding both shapes', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Shape' }))

    expect(screen.getByRole('button', { name: 'Rectangle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Circle' })).toBeInTheDocument()
  })

  it('picks the tool and closes the flyout', () => {
    const onToolChange = vi.fn()
    render(<Toolbar activeTool="select" onToolChange={onToolChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Shape' }))
    fireEvent.click(screen.getByRole('button', { name: 'Circle' }))

    expect(onToolChange).toHaveBeenCalledWith('circle')
    expect(screen.queryByRole('button', { name: 'Circle' })).not.toBeInTheDocument()
  })

  it('marks the group active while either shape is the tool', () => {
    const { rerender } = render(<Toolbar activeTool="circle" onToolChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Shape' })).toHaveAttribute('aria-pressed', 'true')

    rerender(<Toolbar activeTool="rectangle" onToolChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Shape' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('closes the flyout on Escape (from a flyout item) and returns focus to the group', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    const group = screen.getByRole('button', { name: 'Shape' })
    fireEvent.click(group)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Rectangle' }), { key: 'Escape' })

    expect(screen.queryByRole('button', { name: 'Rectangle' })).not.toBeInTheDocument()
    expect(group).toHaveFocus()
  })

  it('closes the flyout on Escape pressed on the group button itself, and keeps focus there', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    const group = screen.getByRole('button', { name: 'Shape' })
    fireEvent.click(group)
    // Simulate having tabbed/shift-tabbed back to the trigger rather than
    // leaving focus on the flyout item the click-open effect landed it on.
    group.focus()
    fireEvent.keyDown(group, { key: 'Escape' })

    expect(screen.queryByRole('button', { name: 'Rectangle' })).not.toBeInTheDocument()
    expect(group).toHaveFocus()
  })

  it('opening the flyout renders it after the trigger, so forward Tab order agrees with focus', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    const group = screen.getByRole('button', { name: 'Shape' })
    fireEvent.click(group)
    const rectangle = screen.getByRole('button', { name: 'Rectangle' })

    // DOCUMENT_POSITION_FOLLOWING means `rectangle` comes after `group` in
    // the DOM. Visual position is separate (`absolute bottom-full` puts the
    // flyout above) — but Tab order follows DOM order, and rendering the
    // flyout before the trigger sent forward Tab straight out of the toolbar.
    expect(
      group.compareDocumentPosition(rectangle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('opening the flyout moves focus straight to the first shape', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Shape' }))

    expect(screen.getByRole('button', { name: 'Rectangle' })).toHaveFocus()
  })

  it('moves focus between the two shapes with ArrowLeft/ArrowRight, wrapping', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Shape' }))
    const rectangle = screen.getByRole('button', { name: 'Rectangle' })
    const circle = screen.getByRole('button', { name: 'Circle' })

    fireEvent.keyDown(rectangle, { key: 'ArrowRight' })
    expect(circle).toHaveFocus()

    fireEvent.keyDown(circle, { key: 'ArrowRight' })
    expect(rectangle).toHaveFocus()

    fireEvent.keyDown(rectangle, { key: 'ArrowLeft' })
    expect(circle).toHaveFocus()
  })

  it('closes when arrow-key focus moves off the group to a sibling tool', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    const group = screen.getByRole('button', { name: 'Shape' })
    fireEvent.click(group)
    group.focus()
    fireEvent.keyDown(group, { key: 'ArrowRight' })

    expect(screen.getByRole('button', { name: 'Connector' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Rectangle' })).not.toBeInTheDocument()
  })

  it('closes when focus moves outside the group entirely', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Shape' }))
    expect(screen.getByRole('button', { name: 'Rectangle' })).toBeInTheDocument()

    // A plain `.focus()` call (as opposed to `fireEvent.keyDown` driving our
    // own arrow-key handling) triggers the blur/onBlur pair outside of
    // Testing Library's own event wrapping, so it needs an explicit `act`.
    act(() => {
      screen.getByRole('button', { name: 'Connector' }).focus()
    })

    expect(screen.queryByRole('button', { name: 'Rectangle' })).not.toBeInTheDocument()
  })

  it('flips aria-expanded when the flyout opens and closes', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    const group = screen.getByRole('button', { name: 'Shape' })
    expect(group).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(group)
    expect(group).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Rectangle' }))
    expect(group).toHaveAttribute('aria-expanded', 'false')
  })

  it('is the toolbar\'s one tabbable stop when a shape tool is active', () => {
    render(<Toolbar activeTool="rectangle" onToolChange={vi.fn()} />)
    const tabbable = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('tabindex') === '0')

    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toHaveAccessibleName('Shape')
  })

  it('moves roving-tabindex focus onto and off the group like any other stop', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    const sticky = screen.getByRole('button', { name: 'Sticky note' })
    const shape = screen.getByRole('button', { name: 'Shape' })
    const connector = screen.getByRole('button', { name: 'Connector' })

    sticky.focus()
    fireEvent.keyDown(sticky, { key: 'ArrowRight' })
    expect(shape).toHaveFocus()

    fireEvent.keyDown(shape, { key: 'ArrowRight' })
    expect(connector).toHaveFocus()

    fireEvent.keyDown(connector, { key: 'ArrowLeft' })
    expect(shape).toHaveFocus()
  })

  it('highlights the active shape inside the flyout, not just via aria-pressed', () => {
    render(<Toolbar activeTool="rectangle" onToolChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Shape' }))

    expect(screen.getByRole('button', { name: 'Rectangle' })).toHaveClass('bg-blue-500')
    expect(screen.getByRole('button', { name: 'Circle' })).not.toHaveClass('bg-blue-500')
  })

  it('keeps the R/C shortcut discoverable on the flyout buttons', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Shape' }))

    expect(screen.getByRole('button', { name: 'Rectangle' })).toHaveAttribute(
      'title',
      'Rectangle (R)'
    )
    expect(screen.getByRole('button', { name: 'Circle' })).toHaveAttribute('title', 'Circle (C)')
  })

  it('does not claim a menu popup that does not exist', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Shape' })).not.toHaveAttribute('aria-haspopup')
  })

  it('still offers the text tool', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument()
  })
})
