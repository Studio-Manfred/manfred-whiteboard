import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

    fireEvent.click(screen.getByRole('button', { name: 'Rectangle' }))

    expect(onToolChange).toHaveBeenCalledWith('rectangle')
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
