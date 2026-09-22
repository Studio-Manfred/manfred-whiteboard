/**
 * Handing a file to the person using the app.
 *
 * Deliberately thin: everything worth testing (what the board looks like, what
 * the file is called) lives in pure functions, and only the browser handover
 * is left here.
 */

const SCALE = 2

/** `manfred-whiteboard-<room>-<date>.<ext>`, safe for a filesystem. */
export function boardFilename(
  roomName: string,
  extension: string,
  now: Date = new Date()
): string {
  const slug =
    roomName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'board'
  const day = now.toISOString().slice(0, 10)

  return `manfred-whiteboard-${slug}-${day}.${extension}`
}

/** Triggers a download, then cleans up after itself. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Rasterises an SVG document through an offscreen canvas at 2x, so the PNG
 * survives being looked at on a decent screen.
 */
export async function svgToPngBlob(
  svg: string,
  width: number,
  height: number
): Promise<Blob> {
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))

  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not render the board to an image'))
      image.src = source
    })

    const canvas = document.createElement('canvas')
    canvas.width = width * SCALE
    canvas.height = height * SCALE

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not render the board to an image')
    context.scale(SCALE, SCALE)
    context.drawImage(image, 0, 0, width, height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
        'image/png'
      )
    })
  } finally {
    URL.revokeObjectURL(source)
  }
}
