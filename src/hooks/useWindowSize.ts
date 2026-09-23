/** The window's inner size, kept current — used to keep floating UI on screen. */

import { useEffect, useState } from 'react'

export interface WindowSize {
  width: number
  height: number
}

function read(): WindowSize {
  return { width: window.innerWidth, height: window.innerHeight }
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(read)

  useEffect(() => {
    const handleResize = () => setSize(read())

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return size
}
