import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWindowSize } from '../src/hooks/useWindowSize'

function resizeTo(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true })
  window.dispatchEvent(new Event('resize'))
}

afterEach(() => resizeTo(1024, 768))

describe('useWindowSize', () => {
  it('reports the current window size', () => {
    const { result } = renderHook(() => useWindowSize())

    expect(result.current).toEqual({ width: window.innerWidth, height: window.innerHeight })
  })

  it('keeps up when the window is resized', () => {
    const { result } = renderHook(() => useWindowSize())

    act(() => resizeTo(640, 480))

    expect(result.current).toEqual({ width: 640, height: 480 })
  })

  it('stops listening once unmounted', () => {
    const { result, unmount } = renderHook(() => useWindowSize())
    unmount()

    act(() => resizeTo(320, 240))

    expect(result.current).not.toEqual({ width: 320, height: 240 })
  })
})
