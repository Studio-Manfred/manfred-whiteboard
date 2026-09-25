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

// jsdom implements no canvas at all: calling `getContext('2d')` logs a loud
// "Not implemented: HTMLCanvasElement.prototype.getContext" error on every
// call, purely as console noise — the call itself already returns `null`,
// which is exactly the "no canvas available" case `canvasMeasure()` in
// `src/lib/text-layout.ts` falls back to `estimateMeasure()` for, and which
// `text-layout.test.ts` and `board-export.test.ts` both test deliberately.
// `TextItem` reaches `canvasMeasure()` (via its `activeMeasure` fallback)
// whenever a caller does not inject its own `measure` prop, which is true of
// `App` on every render — it deliberately never passes one down (doing so
// would defeat the layout memo; see `TextItem`'s comment on
// `activeMeasure`). Stubbing `getContext` to return `null` directly, without
// going through jsdom's own not-implemented path, keeps that exact fallback
// behaviour — nothing downstream can tell the difference — while silencing
// the console. It must not return a *usable* fake context: that would swap
// every test silently from the estimate-based measurer onto a fake one,
// which is exactly what broke on the first attempt at this fix.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
}

afterEach(() => {
  cleanup()
})
