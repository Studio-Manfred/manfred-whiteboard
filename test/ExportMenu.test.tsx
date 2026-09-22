import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExportMenu } from '../src/components/UI/ExportMenu'

function renderMenu() {
  const onExportPng = vi.fn()
  const onExportJson = vi.fn()
  render(<ExportMenu onExportPng={onExportPng} onExportJson={onExportJson} />)
  return { onExportPng, onExportJson, trigger: screen.getByRole('button', { name: 'Export' }) }
}

describe('ExportMenu', () => {
  it('is a collapsed menu button until opened', () => {
    const { trigger } = renderMenu()

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens a menu of the two formats', () => {
    const { trigger } = renderMenu()

    fireEvent.click(trigger)

    expect(screen.getByRole('menu', { name: 'Export' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /PNG/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /JSON/ })).toBeInTheDocument()
  })

  it('exports a PNG and closes', () => {
    const { onExportPng, trigger } = renderMenu()
    fireEvent.click(trigger)

    fireEvent.click(screen.getByRole('menuitem', { name: /PNG/ }))

    expect(onExportPng).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('exports JSON', () => {
    const { onExportJson, trigger } = renderMenu()
    fireEvent.click(trigger)

    fireEvent.click(screen.getByRole('menuitem', { name: /JSON/ }))

    expect(onExportJson).toHaveBeenCalledOnce()
  })

  it('closes on Escape and hands focus back', () => {
    const { trigger } = renderMenu()
    fireEvent.click(trigger)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes when the pointer goes elsewhere', () => {
    const { trigger } = renderMenu()
    fireEvent.click(trigger)

    fireEvent.pointerDown(document.body)

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('moves between items with the arrow keys', () => {
    const { trigger } = renderMenu()
    fireEvent.click(trigger)

    const png = screen.getByRole('menuitem', { name: /PNG/ })
    const json = screen.getByRole('menuitem', { name: /JSON/ })
    expect(png).toHaveFocus()

    fireEvent.keyDown(png, { key: 'ArrowDown' })
    expect(json).toHaveFocus()

    fireEvent.keyDown(json, { key: 'ArrowUp' })
    expect(png).toHaveFocus()
  })
})
