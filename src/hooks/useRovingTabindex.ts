/**
 * The ARIA APG roving-tabindex behaviour shared by the app's toolbars: one tab
 * stop for the whole bar, arrow keys and Home/End to move between its items.
 */

import { useRef, type KeyboardEvent } from 'react'

export interface RovingTabindex {
  /** Spread onto each item, in order. */
  itemProps: (index: number) => {
    ref: (el: HTMLButtonElement | null) => void
    tabIndex: number
    onKeyDown: (e: KeyboardEvent) => void
  }
}

export function useRovingTabindex(count: number, activeIndex = 0): RovingTabindex {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const moveFocus = (e: KeyboardEvent, index: number) => {
    const last = count - 1
    let next: number

    switch (e.key) {
      case 'ArrowRight':
        next = index === last ? 0 : index + 1
        break
      case 'ArrowLeft':
        next = index === 0 ? last : index - 1
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = last
        break
      default:
        return
    }

    e.preventDefault()
    refs.current[next]?.focus()
  }

  return {
    itemProps: (index: number) => ({
      ref: (el: HTMLButtonElement | null) => {
        refs.current[index] = el
      },
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: (e: KeyboardEvent) => moveFocus(e, index),
    }),
  }
}
