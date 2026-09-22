import { test, expect, type Page } from '@playwright/test'

/**
 * Clicking a connector or a pen stroke has to actually land on it. This can
 * only be tested in a real browser: `fireEvent.click` in jsdom dispatches
 * straight at the node and never consults CSS hit-testing, so a component
 * test passes even when the element is unclickable on screen.
 */

const CANVAS = /Interactive canvas workspace/

async function addNote(page: Page, x: number, y: number) {
  await page.getByRole('button', { name: 'Sticky note' }).click()
  await page.getByRole('region', { name: CANVAS }).click({ position: { x, y } })
}

async function connectTheNotes(page: Page) {
  const notes = page.locator('[data-testid^="sticky-"]')
  await notes.first().hover()
  await notes.first().locator('[aria-label="Connect from bottom anchor"]').click({ force: true })
  await notes.last().hover()
  await notes.last().locator('[aria-label="Connect from top anchor"]').click({ force: true })
}

test('an arrow can be clicked, then deleted', async ({ page }) => {
  await page.goto(`/#room=delete-arrow-${Date.now()}`)

  // Stacked vertically and far enough apart that the arrow has a stretch of
  // its own to click, clear of either note's anchors — and narrow enough to
  // fit the mobile project's 393px viewport.
  await addNote(page, 180, 150)
  await addNote(page, 180, 520)
  await connectTheNotes(page)

  const connector = page.locator('[data-testid^="connector-"]')
  await expect(connector).toHaveCount(1)

  // Click the middle of the arrow, between the two notes.
  const box = (await connector.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

  // Selected arrows are drawn in blue with the highlighted arrowhead.
  await expect(connector.locator('path').nth(1)).toHaveAttribute('stroke', '#3b82f6')

  await page.keyboard.press('Delete')

  await expect(connector).toHaveCount(0)
  // The notes it joined are untouched.
  await expect(page.locator('[data-testid^="sticky-"]')).toHaveCount(2)
})

test('a pen stroke can be clicked, then deleted', async ({ page }) => {
  await page.goto(`/#room=delete-ink-${Date.now()}`)

  await page.getByRole('button', { name: 'Pen' }).click()
  await page.mouse.move(120, 200)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(120 + i * 15, 200)
  await page.mouse.up()

  const drawing = page.locator('[data-testid^="drawing-"]')
  await expect(drawing).toHaveCount(1)

  await page.getByRole('button', { name: 'Select' }).click()
  await page.mouse.click(195, 200)
  await expect(drawing.locator('path').nth(1)).toHaveAttribute('stroke', '#3b82f6')

  await page.keyboard.press('Delete')

  await expect(drawing).toHaveCount(0)
})
