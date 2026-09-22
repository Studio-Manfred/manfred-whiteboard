import { test, expect, type Page } from '@playwright/test'

/**
 * Resizing is pointer-heavy, and jsdom only approximates pointer behaviour —
 * so the drag is worth proving in a real browser.
 */

const CANVAS = /Interactive canvas workspace/

async function placeAndSelectNote(page: Page) {
  await page.getByRole('button', { name: 'Sticky note' }).click()
  await page.getByRole('region', { name: CANVAS }).click({ position: { x: 180, y: 240 } })
  const note = page.locator('[data-testid^="sticky-"]').first()
  await note.click({ position: { x: 20, y: 20 } })
  return note
}

async function sizeOf(note: ReturnType<Page['locator']>) {
  return note.evaluate((el) => ({
    width: parseFloat((el as HTMLElement).style.width),
    height: parseFloat((el as HTMLElement).style.height),
    left: parseFloat((el as HTMLElement).style.left),
  }))
}

test('grows an element by dragging a corner handle', async ({ page }) => {
  await page.goto(`/#room=resize-drag-${Date.now()}`)
  const note = await placeAndSelectNote(page)
  const before = await sizeOf(note)

  const handle = page.getByRole('button', { name: 'Resize from bottom right corner' })
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 80, box.y + 60, { steps: 8 })
  await page.mouse.up()

  const after = await sizeOf(note)
  expect(after.width).toBeGreaterThan(before.width)
  expect(after.height).toBeGreaterThan(before.height)
  // The corner opposite the one dragged stays where it was.
  expect(after.left).toBeCloseTo(before.left, 1)
})

test('resizes from the keyboard alone', async ({ page }) => {
  await page.goto(`/#room=resize-keys-${Date.now()}`)
  const note = await placeAndSelectNote(page)
  const before = await sizeOf(note)

  const handle = page.getByRole('button', { name: 'Resize from right edge' })
  await handle.focus()
  await expect(handle).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Shift+ArrowRight')

  const after = await sizeOf(note)
  expect(after.width).toBeCloseTo(before.width + 50, 1)
  expect(after.height).toBeCloseTo(before.height, 1)
})
