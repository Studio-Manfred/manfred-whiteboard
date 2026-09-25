import { test, expect, type Page } from '@playwright/test'

/**
 * Fill patterns only exist once a browser resolves `fill="url(#…)"` against a
 * live `<pattern>` def. jsdom parses both and paints neither, so a component
 * test can only prove the attributes were written — never that the def the
 * shape points at is actually there, or that the same def survives an export
 * the browser has to rasterise. That is what lives here.
 *
 * The def id is `pattern-<elementId>` (`patternIdFor` in
 * `src/lib/fill-patterns.ts`). It is spelled out rather than imported: it is
 * the contract the canvas and the export both publish, so the acceptance test
 * should break if it moves.
 */

const CANVAS = /Interactive canvas workspace/

const patternDefId = (elementId: string) => `pattern-${elementId}`

/**
 * Where a shape can sit and still have room for the Fill panel.
 *
 * The panel is centred on its trigger with no clamping, and Fill is the
 * leftmost control on a shape's (wide) bar — so a shape near the left edge
 * opens its panel off-screen. That is STU-927, a pre-existing bug; these
 * specs place shapes clear of it rather than assert it.
 */
function shapeSpot(page: Page) {
  const width = page.viewportSize()?.width ?? 1280
  // The mobile offset grew with STU-953's text-colour control: an eighth
  // trigger widens the bar, which shifts Fill (its leftmost control) further
  // left too, so the old 200 no longer clears STU-927 on a narrow viewport.
  return { x: width >= 700 ? 420 : 280, y: 300 }
}

/**
 * Rectangle and circle live behind the toolbar's Shape flyout (STU-953) —
 * opening it is now a prerequisite step before picking either one.
 */
async function pickShape(page: Page, name: 'Rectangle' | 'Circle') {
  await page.getByRole('button', { name: 'Shape' }).click()
  await page.getByRole('button', { name, exact: true }).click()
}

/**
 * Draws a rectangle, which lands selected with its properties bar showing.
 * The locator is pinned to the new shape's own id, so it keeps pointing at
 * that shape once another is drawn on top of it.
 */
async function rectangle(page: Page, offsetY = 0) {
  const spot = shapeSpot(page)
  await pickShape(page, 'Rectangle')
  await page
    .getByRole('region', { name: CANVAS })
    .click({ position: { x: spot.x, y: spot.y + offsetY } })

  const newest = page.locator('[data-testid^="shape-"]').last()
  await expect(newest).toBeVisible()
  const id = (await newest.getAttribute('data-testid'))!.replace('shape-', '')

  return { shape: page.locator(`[data-testid="shape-${id}"]`), id }
}

/** The painted body of a shape — not the tile rect nested inside the def. */
function body(shape: ReturnType<Page['locator']>) {
  return shape.locator('svg > rect')
}

async function openFillPanel(page: Page) {
  await page.getByRole('button', { name: 'Fill colour' }).click()
  await expect(page.getByRole('dialog', { name: 'Fill colour' })).toBeVisible()
}

/** Picks a swatch or a pattern chip; either choice closes the panel. */
async function choose(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click()
}

test('a pattern chip paints the shape from a live pattern def', async ({ page }) => {
  await page.goto(`/#room=pattern-apply-${Date.now()}`)
  const { shape, id } = await rectangle(page)

  // A solid fill first, so the pattern has a tile background to sit on and
  // clearing it later has something to fall back to.
  await openFillPanel(page)
  await choose(page, 'Lavender')
  await expect(body(shape)).toHaveAttribute('fill', '#E8D7FF')

  await openFillPanel(page)
  await choose(page, 'Diagonal hatch')

  const def = patternDefId(id)
  await expect(body(shape)).toHaveAttribute('fill', `url(#${def})`)

  // The def the fill points at is really in the document, and really carries
  // ink — a `<pattern>` with no marks would paint nothing at all.
  const pattern = shape.locator(`defs pattern[id="${def}"]`)
  await expect(pattern).toHaveCount(1)
  await expect(pattern).toHaveAttribute('patternUnits', 'userSpaceOnUse')
  expect(await pattern.locator('path').count()).toBeGreaterThan(0)
  // The tile paints the shape's own fill behind the ink.
  await expect(pattern.locator('rect')).toHaveAttribute('fill', '#E8D7FF')
})

test('the No pattern chip puts the shape back on a solid fill', async ({ page }) => {
  await page.goto(`/#room=pattern-clear-${Date.now()}`)
  const { shape, id } = await rectangle(page)
  const def = patternDefId(id)

  await openFillPanel(page)
  await choose(page, 'Sky Blue')
  await openFillPanel(page)
  await choose(page, 'Ben-Day dots')
  await expect(body(shape)).toHaveAttribute('fill', `url(#${def})`)

  await openFillPanel(page)
  await choose(page, 'No pattern')

  await expect(body(shape)).toHaveAttribute('fill', '#CCE2FF')
  // The def goes with it: nothing is left pointing at a shape that no longer
  // uses it.
  await expect(shape.locator(`defs pattern[id="${def}"]`)).toHaveCount(0)
})

test('two patterned shapes each get a def of their own', async ({ page }) => {
  await page.goto(`/#room=pattern-two-${Date.now()}`)

  const first = await rectangle(page)
  await openFillPanel(page)
  await choose(page, 'Crosshatch')

  // Clear of the first, and clear of the left edge on both viewports.
  const second = await rectangle(page, 200)
  expect(second.id).not.toBe(first.id)

  await openFillPanel(page)
  await choose(page, 'Scanline')

  await expect(body(first.shape)).toHaveAttribute('fill', `url(#${patternDefId(first.id)})`)
  await expect(body(second.shape)).toHaveAttribute('fill', `url(#${patternDefId(second.id)})`)
  // Scoped ids, so the two defs never collide — and axe never sees a duplicate.
  await expect(page.locator(`pattern[id="${patternDefId(first.id)}"]`)).toHaveCount(1)
  await expect(page.locator(`pattern[id="${patternDefId(second.id)}"]`)).toHaveCount(1)
})

test('a sticky note is offered no pattern row', async ({ page }) => {
  await page.goto(`/#room=pattern-sticky-${Date.now()}`)

  await page.getByRole('button', { name: 'Sticky note' }).click()
  // Notes get a narrower bar than shapes, so this sits clear of STU-927 on
  // both viewports.
  await page.getByRole('region', { name: CANVAS }).click({ position: { x: 200, y: 300 } })
  await expect(page.locator('[data-testid^="sticky-"]')).toHaveCount(1)

  await openFillPanel(page)

  // Colours, yes. Patterns, no — a note has no `pattern` to carry.
  await expect(page.getByRole('button', { name: 'Lavender', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'No pattern', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Crosshatch', exact: true })).toHaveCount(0)
})

test('the pattern chips are reachable and operable from the keyboard', async ({ page }) => {
  await page.goto(`/#room=pattern-keys-${Date.now()}`)
  const { shape, id } = await rectangle(page)

  const trigger = page.getByRole('button', { name: 'Fill colour' })
  await trigger.focus()
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Fill colour' })).toBeVisible()

  // Tab forward from the trigger: the chips must sit in the natural tab order
  // behind the swatches, not be mouse-only. The bound is generous but finite,
  // so an unreachable chip fails rather than hangs.
  let focused: string | null = null
  for (let step = 0; step < 24 && focused !== 'Crosshatch'; step += 1) {
    await page.keyboard.press('Tab')
    focused = await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label') ?? null
    )
  }
  expect(focused).toBe('Crosshatch')

  await page.keyboard.press('Enter')

  await expect(body(shape)).toHaveAttribute('fill', `url(#${patternDefId(id)})`)
  // Choosing closes the panel and hands focus back, so the keyboard never
  // lands nowhere.
  await expect(page.getByRole('dialog', { name: 'Fill colour' })).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(trigger).toBeVisible()
})

test('a patterned board exports an SVG that carries its pattern def', async ({ page }) => {
  // There is no SVG item in the Export menu: `boardToSvg` exists only to feed
  // the PNG rasteriser, which hands the document to the browser as an
  // `image/svg+xml` blob (`svgToPngBlob` in `src/lib/download.ts`). Keeping a
  // reference to that blob is the only way to read the SVG the production
  // build actually produced. Revoking the URL does not touch the Blob, so it
  // is still readable after the download lands.
  await page.addInitScript(() => {
    const createObjectURL = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (source: Blob | MediaSource) => {
      if (source instanceof Blob && source.type === 'image/svg+xml') {
        ;(window as unknown as { __exportedSvg?: Blob }).__exportedSvg = source
      }
      return createObjectURL(source)
    }
  })

  await page.goto(`/#room=pattern-export-${Date.now()}`)
  const { shape, id } = await rectangle(page)

  await openFillPanel(page)
  await choose(page, 'Checkerboard')
  const def = patternDefId(id)
  await expect(body(shape)).toHaveAttribute('fill', `url(#${def})`)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('menuitem', { name: /PNG/ }).click()
  const download = await downloadPromise

  // Something downloaded at all: the patterned SVG was well-formed enough for
  // the browser to load and rasterise it. A broken def rejects in
  // `svgToPngBlob` and nothing is written.
  expect(download.suggestedFilename()).toMatch(/\.png$/)
  const bytes = await (await import('node:fs/promises')).readFile(await download.path())
  expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]))

  const svg = await page.evaluate(() => {
    const held = (window as unknown as { __exportedSvg?: Blob }).__exportedSvg
    return held ? held.text() : null
  })

  expect(svg).not.toBeNull()
  expect(svg).toContain(`<pattern id="${def}"`)
  expect(svg).toContain(`fill="url(#${def})"`)
  // Every def sits in the one shared `<defs>` block.
  expect(svg!.indexOf(`<pattern id="${def}"`)).toBeLessThan(svg!.indexOf('</defs>'))
})

test('a patterned board keeps its pattern in the JSON backup', async ({ page }) => {
  await page.goto(`/#room=pattern-json-${Date.now()}`)
  await rectangle(page)

  await openFillPanel(page)
  await choose(page, 'Scanline')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('menuitem', { name: /JSON/ }).click()
  const download = await downloadPromise

  const { readFile } = await import('node:fs/promises')
  const backup = JSON.parse(await readFile(await download.path(), 'utf8'))

  expect(backup.elements).toHaveLength(1)
  expect(backup.elements[0].pattern).toBe('scanline')
})
