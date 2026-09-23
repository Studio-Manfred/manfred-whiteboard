import { test, expect, type Page } from '@playwright/test'

/**
 * Drawing an arrow is a pointer drag with live snapping — none of which jsdom
 * can vouch for, since it does no layout and no hit-testing.
 */

const CANVAS = /Interactive canvas workspace/

async function twoNotes(page: Page) {
  for (const [x, y] of [
    [180, 150],
    [180, 520],
  ]) {
    await page.getByRole('button', { name: 'Sticky note' }).click()
    await page.getByRole('region', { name: CANVAS }).click({ position: { x, y } })
  }
  const notes = page.locator('[data-testid^="sticky-"]')
  return { first: notes.first(), last: notes.last(), all: notes }
}

async function centreOf(locator: ReturnType<Page['locator']>) {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test('drag from an anchor to another element to draw an arrow', async ({ page }) => {
  await page.goto(`/#room=draw-arrow-${Date.now()}`)
  const { first, last } = await twoNotes(page)

  await first.hover()
  const start = await centreOf(first.locator('[aria-label="Connect from bottom anchor"]'))
  const target = await centreOf(last.locator('[aria-label="Connect from top anchor"]'))

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y - 100, { steps: 10 })

  // Mid-drag: a preview follows the pointer and the destination shows its dots.
  await expect(page.getByTestId('draft-arrow')).toHaveCount(1)
  await expect(page.locator('[data-testid^="connector-"]')).toHaveCount(0)
  await expect(last.locator('[aria-label="Connect from top anchor"]')).toHaveCSS(
    'opacity',
    '1'
  )

  // Coming close snaps it: the preview turns blue and the anchor is marked.
  await page.mouse.move(target.x, target.y + 8, { steps: 6 })
  await expect(page.getByTestId('draft-arrow')).toHaveAttribute('stroke', '#3b82f6')
  await expect(
    last.locator('[aria-label="Connect from top anchor"]')
  ).toHaveAttribute('data-snap-target', 'true')

  await page.mouse.up()

  await expect(page.locator('[data-testid^="connector-"]')).toHaveCount(1)
  await expect(page.getByTestId('draft-arrow')).toHaveCount(0)
})

test('dropping an arrow on empty canvas draws nothing', async ({ page }) => {
  await page.goto(`/#room=drop-nowhere-${Date.now()}`)
  const { first } = await twoNotes(page)

  await first.hover()
  const start = await centreOf(first.locator('[aria-label="Connect from right anchor"]'))

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 120, start.y + 60, { steps: 8 })
  await page.mouse.up()

  await expect(page.locator('[data-testid^="connector-"]')).toHaveCount(0)
})

test('Escape abandons an arrow mid-drag', async ({ page }) => {
  await page.goto(`/#room=escape-arrow-${Date.now()}`)
  const { first, last } = await twoNotes(page)

  await first.hover()
  const start = await centreOf(first.locator('[aria-label="Connect from bottom anchor"]'))
  const target = await centreOf(last)

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 8 })
  await expect(page.getByTestId('draft-arrow')).toHaveCount(1)

  await page.keyboard.press('Escape')
  await expect(page.getByTestId('draft-arrow')).toHaveCount(0)

  await page.mouse.up()
  await expect(page.locator('[data-testid^="connector-"]')).toHaveCount(0)
})
