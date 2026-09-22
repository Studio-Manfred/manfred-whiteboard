import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorPicker } from '../src/components/UI/ColorPicker'

function renderPicker(props: Partial<React.ComponentProps<typeof ColorPicker>> = {}) {
  const onSelect = vi.fn()
  render(<ColorPicker value="#FFF9B1" showBorder={true} onSelect={onSelect} {...props} />)
  return { onSelect, trigger: screen.getByRole('button', { name: 'Colours' }) }
}

describe('ColorPicker', () => {
  it('is a single collapsed button until opened', () => {
    const { trigger } = renderPicker()

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(screen.queryByRole('button', { name: 'Coral Pink' })).not.toBeInTheDocument()
  })

  it('opens the swatches on click', () => {
    const { trigger } = renderPicker()

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Coral Pink' })).toBeInTheDocument()
  })

  it('names swatches rather than exposing hex codes', () => {
    const { trigger } = renderPicker()
    fireEvent.click(trigger)

    expect(screen.getByRole('button', { name: 'No fill' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ink' })).toBeInTheDocument()
  })

  it('reports a fill choice and closes', () => {
    const { onSelect, trigger } = renderPicker()
    fireEvent.click(trigger)

    fireEvent.click(screen.getByRole('button', { name: 'Sky Blue' }))

    expect(onSelect).toHaveBeenCalledWith('#CCE2FF', 'fill')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('reports a border choice separately', () => {
    const { onSelect, trigger } = renderPicker()
    fireEvent.click(trigger)

    fireEvent.click(screen.getByRole('button', { name: 'Red' }))

    expect(onSelect).toHaveBeenCalledWith('#dc2626', 'border')
  })

  it('hides the border section when the selection cannot use one', () => {
    const { trigger } = renderPicker({ showBorder: false })
    fireEvent.click(trigger)

    expect(screen.getByRole('button', { name: 'Sky Blue' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ink' })).not.toBeInTheDocument()
  })

  it('marks the current colour as pressed', () => {
    const { trigger } = renderPicker({ value: '#FFF9B1' })
    fireEvent.click(trigger)

    expect(screen.getByRole('button', { name: 'Sunbeam Yellow' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Sky Blue' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('closes on Escape and hands focus back to the trigger', () => {
    const { trigger } = renderPicker()
    fireEvent.click(trigger)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('closes when the pointer goes elsewhere', () => {
    const { trigger } = renderPicker()
    fireEvent.click(trigger)

    fireEvent.pointerDown(document.body)

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('labels each section', () => {
    const { trigger } = renderPicker()
    fireEvent.click(trigger)

    expect(screen.getByRole('group', { name: 'Fill' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Border' })).toBeInTheDocument()
  })

  it('takes the roving-tabindex props the toolbar gives it', () => {
    const onKeyDown = vi.fn()
    const { trigger } = renderPicker({ tabIndex: -1, onKeyDown })

    expect(trigger).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(trigger, { key: 'ArrowLeft' })
    expect(onKeyDown).toHaveBeenCalled()
  })
})
