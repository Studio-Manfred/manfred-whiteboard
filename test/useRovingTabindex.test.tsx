import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useRovingTabindex } from '../src/hooks/useRovingTabindex'

function Bar({ count = 3, activeIndex = 0 }: { count?: number; activeIndex?: number }) {
  const roving = useRovingTabindex(count, activeIndex)

  return (
    <div role="toolbar" aria-label="Test bar">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" {...roving.itemProps(i)}>
          Item {i + 1}
        </button>
      ))}
    </div>
  )
}

const item = (n: number) => screen.getByRole('button', { name: `Item ${n}` })

describe('useRovingTabindex', () => {
  it('leaves exactly one tab stop, on the active item', () => {
    render(<Bar activeIndex={1} />)

    expect(item(1)).toHaveAttribute('tabindex', '-1')
    expect(item(2)).toHaveAttribute('tabindex', '0')
    expect(item(3)).toHaveAttribute('tabindex', '-1')
  })

  it('moves focus with the arrow keys', () => {
    render(<Bar />)
    item(1).focus()

    fireEvent.keyDown(item(1), { key: 'ArrowRight' })
    expect(item(2)).toHaveFocus()

    fireEvent.keyDown(item(2), { key: 'ArrowLeft' })
    expect(item(1)).toHaveFocus()
  })

  it('wraps at both ends', () => {
    render(<Bar />)
    item(1).focus()

    fireEvent.keyDown(item(1), { key: 'ArrowLeft' })
    expect(item(3)).toHaveFocus()

    fireEvent.keyDown(item(3), { key: 'ArrowRight' })
    expect(item(1)).toHaveFocus()
  })

  it('jumps to the ends with Home and End', () => {
    render(<Bar />)
    item(2).focus()

    fireEvent.keyDown(item(2), { key: 'End' })
    expect(item(3)).toHaveFocus()

    fireEvent.keyDown(item(3), { key: 'Home' })
    expect(item(1)).toHaveFocus()
  })

  it('leaves other keys alone', () => {
    render(<Bar />)
    item(1).focus()

    fireEvent.keyDown(item(1), { key: 'a' })

    expect(item(1)).toHaveFocus()
  })

  it('copes with a single item', () => {
    render(<Bar count={1} />)
    item(1).focus()

    fireEvent.keyDown(item(1), { key: 'ArrowRight' })

    expect(item(1)).toHaveFocus()
  })
})
