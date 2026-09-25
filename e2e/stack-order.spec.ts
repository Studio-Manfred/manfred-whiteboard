import { test, expect, type Page } from '@playwright/test'

/**
 * Stacking is only really proved by what a click lands on, which needs real
 * paint order — jsdom has none.
 */

const CANVAS = /Interactive canvas workspace/

async function note(page: Page, x: number, y: number) {
  await page.getByRole('button', { name: 'Sticky note' }).click()
  await page.getByRole('region', { name: CANVAS }).click({ position: { x, y } })
  return page.locator('[data-testid^="sticky-"]').last()
}

/**
 * Rectangle and circle live behind the toolbar's Shape flyout (STU-953) —
 * opening it is now a prerequisite step before picking either one.
 */
async function pickShape(page: Page, name: 'Rectangle' | 'Circle') {
  await page.getByRole('button', { name: 'Shape' }).click()
  await page.getByRole('button', { name, exact: true }).click()
}

/** The id of whichever element is currently selected. */
async function selectedId(page: Page) {
  return page
    .locator('[data-testid^="sticky-"].ring-blue-500')
    .first()
    .getAttribute('data-testid')
}

async function stack(page: Page, command: string) {
  await page.getByRole('button', { name: 'Stack order' }).click()
  await page.getByRole('button', { name: command }).click()
}

test('sending to back changes what a click in the overlap hits', async ({ page }) => {
  await page.goto(`/#room=stack-${Date.now()}`)
  const canvas = page.getByRole('region', { name: CANVAS })

  const first = await note(page, 150, 200)
  const second = await note(page, 210, 250)
  const firstId = await first.getAttribute('data-testid')
  const secondId = await second.getAttribute('data-testid')

  // They overlap around here; the newer note is on top.
  const overlap = { x: 185, y: 230 }
  await canvas.click({ position: overlap })
  expect(await selectedId(page)).toBe(secondId)

  await stack(page, 'Send to back')

  await canvas.click({ position: overlap })
  expect(await selectedId(page)).toBe(firstId)
})

test('a shape can be brought above a note', async ({ page }) => {
  await page.goto(`/#room=stack-shape-${Date.now()}`)
  const canvas = page.getByRole('region', { name: CANVAS })

  await pickShape(page, 'Rectangle')
  await canvas.click({ position: { x: 180, y: 220 } })
  const shape = page.locator('[data-testid^="shape-"]').first()
  await note(page, 200, 240)

  // Select the shape by a corner of its own, away from the note.
  const shapeBox = (await shape.boundingBox())!
  await page.mouse.click(shapeBox.x + 8, shapeBox.y + 8)
  await stack(page, 'Bring to front')

  const overlap = { x: 200, y: 240 }
  await canvas.click({ position: overlap })

  await expect(page.locator('[data-testid^="shape-"].ring-blue-500')).toHaveCount(1)
})
