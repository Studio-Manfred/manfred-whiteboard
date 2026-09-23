import { test, expect, type Page } from '@playwright/test'

/**
 * The bar is positioned from real layout — where the selection sits on screen,
 * how big the bar is, how much room is left above it. None of that exists in
 * jsdom, so placement is checked here.
 */

const CANVAS = /Interactive canvas workspace/

async function noteAt(page: Page, x: number, y: number) {
  await page.getByRole('button', { name: 'Sticky note' }).click()
  await page.getByRole('region', { name: CANVAS }).click({ position: { x, y } })
  return page.locator('[data-testid^="sticky-"]').last()
}

test('the bar appears above the selection and follows it', async ({ page }) => {
  await page.goto(`/#room=bar-position-${Date.now()}`)
  const note = await noteAt(page, 180, 420)

  const bar = page.getByRole('toolbar', { name: 'Selection properties' })
  await expect(bar).toBeVisible()
  await expect(bar).toHaveAttribute('data-placement', 'above')

  const noteBox = (await note.boundingBox())!
  const barBox = (await bar.boundingBox())!
  expect(barBox.y + barBox.height).toBeLessThanOrEqual(noteBox.y)
  // roughly centred over the note
  expect(Math.abs(barBox.x + barBox.width / 2 - (noteBox.x + noteBox.width / 2))).toBeLessThan(40)

  // Drag the note; the bar comes along.
  await page.mouse.move(noteBox.x + 40, noteBox.y + 40)
  await page.mouse.down()
  await page.mouse.move(noteBox.x + 40, noteBox.y + 140, { steps: 8 })
  await page.mouse.up()

  const movedBar = (await bar.boundingBox())!
  expect(movedBar.y).toBeGreaterThan(barBox.y)
})

test('the bar flips below a selection near the top of the screen', async ({ page }) => {
  await page.goto(`/#room=bar-flip-${Date.now()}`)
  const note = await noteAt(page, 180, 140)

  const bar = page.getByRole('toolbar', { name: 'Selection properties' })
  await expect(bar).toHaveAttribute('data-placement', 'below')

  const noteBox = (await note.boundingBox())!
  const barBox = (await bar.boundingBox())!
  expect(barBox.y).toBeGreaterThanOrEqual(noteBox.y + noteBox.height)
})

test('restyling from the bar changes the element', async ({ page }) => {
  await page.goto(`/#room=bar-restyle-${Date.now()}`)
  const note = await noteAt(page, 180, 420)

  await page.getByRole('button', { name: 'Fill colour' }).click()
  await page.getByRole('button', { name: 'Lavender' }).click()
  await expect(note).toHaveCSS('background-color', 'rgb(232, 215, 255)')

  await page.getByRole('button', { name: 'Text size' }).click()
  await page.getByRole('button', { name: '32 px' }).click()
  await expect(note.locator('div').first()).toHaveCSS('font-size', '32px')
})
