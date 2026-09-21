import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom does not implement PointerEvent. Without this, `fireEvent.pointerDown(el,
// { clientX, clientY })` silently drops the coordinates and handlers receive NaN,
// so any test of pointer position passes or fails for the wrong reason.
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    readonly isPrimary: boolean

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
      this.pointerType = params.pointerType ?? 'mouse'
      this.isPrimary = params.isPrimary ?? true
    }
  }

  window.PointerEvent = PointerEventPolyfill as unknown as typeof window.PointerEvent
  globalThis.PointerEvent = window.PointerEvent
}

afterEach(() => {
  cleanup()
})
