import { test, expect } from '@playwright/test'

/**
 * The PNG path rasterises an SVG through a canvas, which jsdom cannot do — so
 * the only honest test of it is a real browser producing a real file.
 */

const CANVAS = /Interactive canvas workspace/

async function placeANote(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Sticky note' }).click()
  // Keep inside the narrowest project viewport (Pixel 5 is 393px wide).
  await page.getByRole('region', { name: CANVAS }).click({ position: { x: 160, y: 220 } })
}

test('exports the board as a PNG', async ({ page }) => {
  await page.goto(`/#room=export-png-${Date.now()}`)
  await placeANote(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('menuitem', { name: /PNG/ }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^manfred-whiteboard-export-png-.*\.png$/)

  const path = await download.path()
  const { readFile } = await import('node:fs/promises')
  const bytes = await readFile(path)

  expect(bytes.byteLength).toBeGreaterThan(1000)
  // PNG magic number — proves a real image came out, not an empty file.
  expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
})

test('exports the board as JSON that carries its elements', async ({ page }) => {
  await page.goto(`/#room=export-json-${Date.now()}`)
  await placeANote(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('menuitem', { name: /JSON/ }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/\.json$/)

  const path = await download.path()
  const { readFile } = await import('node:fs/promises')
  const backup = JSON.parse(await readFile(path, 'utf8'))

  expect(backup.version).toBe(1)
  expect(backup.elements).toHaveLength(1)
  expect(backup.elements[0].type).toBe('sticky')
})
