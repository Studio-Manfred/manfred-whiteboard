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

test('resizes a freehand stroke, scaling the ink itself', async ({ page }) => {
  await page.goto(`/#room=resize-ink-${Date.now()}`)

  await page.getByRole('button', { name: 'Pen' }).click()
  await page.mouse.move(120, 250)
  await page.mouse.down()
  for (const [x, y] of [[180, 320], [240, 260], [300, 330]]) {
    await page.mouse.move(x, y, { steps: 8 })
  }
  await page.mouse.up()
  await page.getByRole('button', { name: 'Select' }).click()

  const item = page.locator('[data-testid^="drawing-"]').first()
  const widthOf = () => item.evaluate((el) => parseFloat((el as HTMLElement).style.width))
  const inkPath = () => item.locator('[data-ink="pen"]').getAttribute('d')

  // Select through the stroke itself, at its starting end.
  await page.mouse.click(122, 252)
  await expect(page.getByRole('button', { name: /^Resize from/ })).toHaveCount(8)

  const before = await widthOf()
  const beforePath = await inkPath()

  const handle = page.getByRole('button', { name: 'Resize from right edge' })
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 100, box.y, { steps: 10 })
  await page.mouse.up()

  expect(await widthOf()).toBeGreaterThan(before)
  // The ink is redrawn, not merely its box: the handles live in a layer that
  // disables pointer events, so this only works while they re-enable their own.
  expect(await inkPath()).not.toBe(beforePath)
  await expect(page.getByRole('button', { name: /^Resize from/ })).toHaveCount(8)
})

test('moves a freehand stroke, ink and all', async ({ page }) => {
  await page.goto(`/#room=move-ink-${Date.now()}`)

  await page.getByRole('button', { name: 'Pen' }).click()
  await page.mouse.move(150, 250)
  await page.mouse.down()
  for (const [x, y] of [[210, 320], [270, 260]]) await page.mouse.move(x, y, { steps: 8 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Select' }).click()

  const ink = page.locator('[data-testid^="drawing-"] [data-ink="pen"]').first()
  const before = (await ink.boundingBox())!

  // Grab the stroke itself and drag it.
  await page.mouse.move(153, 253)
  await page.mouse.down()
  await page.mouse.move(253, 253, { steps: 12 })
  await page.mouse.up()

  const after = (await ink.boundingBox())!
  // The ink has to move on screen, not merely its bounding box: the points are
  // world coordinates and the svg viewBox follows the box, so moving the box
  // alone cancels out and the stroke stays put.
  expect(after.x).toBeGreaterThan(before.x + 50)
})

