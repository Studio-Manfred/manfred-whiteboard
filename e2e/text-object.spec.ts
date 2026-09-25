import { test, expect, type Page, type Locator } from '@playwright/test'

/**
 * Text objects (STU-953) lean on real browser behaviour more than most
 * elements: height is derived from real `measureText` metrics jsdom cannot
 * produce, the inner `text-body` div is genuinely 0x0 when empty so a
 * component test cannot prove it is clickable, committing an edit depends on
 * a real blur, and the freshly-created-object focus race and the Shape
 * flyout's outside-click dismissal both depend on the browser's native
 * default pointerdown action running after React's own listeners — jsdom has
 * no such default action to run. See `docs/context/STU-953.md`'s Traps
 * section for the fuller story on each of these.
 */

const CANVAS = /Interactive canvas workspace/

/**
 * Where a text object can sit and still have its (narrower) properties bar
 * land on screen. Text carries fewer controls than a shape — no fill,
 * border, thickness, pattern or arrowheads — but the STU-927 left-edge
 * clipping this sidesteps is the same bug `fill-pattern.spec.ts`'s
 * `shapeSpot` avoids, so this follows the same shape.
 */
function textSpot(page: Page) {
  const width = page.viewportSize()?.width ?? 1280
  return { x: width >= 700 ? 400 : 220, y: 260 }
}

/**
 * Draws a text object with the tool. It lands already in edit mode with an
 * empty draft — no double-click needed, unlike every other element (STU-953).
 * Pinned to its own id, so the locator survives another element being drawn
 * later rather than silently re-resolving the way a live `.last()` would.
 */
async function createText(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Text' }).click()
  await page.getByRole('region', { name: CANVAS }).click({ position: textSpot(page) })

  const newest = page.locator('[data-testid^="text-"]').last()
  await expect(newest).toBeVisible()
  const id = (await newest.getAttribute('data-testid'))!.replace('text-', '')

  return page.locator(`[data-testid="text-${id}"]`)
}

/**
 * Types into the object's own textarea and commits by moving focus away with
 * Tab. A click elsewhere would also land on the canvas's own pointerdown
 * handler for the select tool, which clears the whole selection on the same
 * event — losing the very selection (and its resize handles / properties
 * bar) most of these tests build on next. Tab dispatches no pointerdown at
 * all, so it blurs the textarea (committing the draft) without touching
 * selection.
 */
async function typeAndCommit(page: Page, text: Locator, value: string) {
  await text.getByRole('textbox').fill(value)
  await page.keyboard.press('Tab')
}

/**
 * Re-opens an already-committed object for more editing. Must target the
 * OUTER container, never the inner `text-body` div: an empty text object's
 * `text-body` is genuinely 0x0, and Playwright correctly refuses to
 * double-click something with no visible pixels — but once there is
 * committed text the outer container is always real geometry
 * (`drawnHeight` is `Math.max(layout.height, fontSize * LINE_HEIGHT)`), so
 * this works regardless of what the object currently holds.
 */
async function reopen(text: Locator) {
  await text.dblclick()
}

async function heightOf(text: Locator): Promise<number> {
  return text.evaluate((el) => parseFloat((el as HTMLElement).style.height))
}

async function widthOf(text: Locator): Promise<number> {
  return text.evaluate((el) => parseFloat((el as HTMLElement).style.width))
}

async function openTextColourPanel(page: Page) {
  await page.getByRole('button', { name: 'Text colour' }).click()
  await expect(page.getByRole('dialog', { name: 'Text colour' })).toBeVisible()
}

/**
 * Installs a hook that captures the SVG blob the export path builds before
 * handing it to the PNG rasteriser — there is no user-facing SVG download,
 * so this is the only way to read what `boardToSvg` actually produced,
 * exactly as fill-pattern.spec.ts does for the same reason. Must be called
 * before `page.goto`, since it works via `addInitScript`.
 */
async function captureExportedSvg(page: Page) {
  await page.addInitScript(() => {
    const createObjectURL = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (source: Blob | MediaSource) => {
      if (source instanceof Blob && source.type === 'image/svg+xml') {
        ;(window as unknown as { __exportedSvg?: Blob }).__exportedSvg = source
      }
      return createObjectURL(source)
    }
  })
}

/** Triggers the PNG export and returns the SVG `captureExportedSvg` caught. */
async function exportAndReadSvg(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('menuitem', { name: /PNG/ }).click()
  await downloadPromise

  const svg = await page.evaluate(() => {
    const held = (window as unknown as { __exportedSvg?: Blob }).__exportedSvg
    return held ? held.text() : null
  })
  expect(svg).not.toBeNull()
  return svg!
}

function tspanLines(svg: string): string[] {
  return [...svg.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((m) => m[1])
}

test('creating a text object enters edit mode immediately, and committed text renders as lines', async ({
  page,
}) => {
  await page.goto(`/#room=text-create-${Date.now()}`)
  const text = await createText(page)

  // No double-click needed — a fresh object starts in edit mode (STU-953).
  const textarea = text.getByRole('textbox')
  await expect(textarea).toBeVisible()
  await expect(textarea).toBeFocused()

  await typeAndCommit(page, text, 'Hello board')

  await expect(textarea).toHaveCount(0)
  const lines = text.locator('[data-testid="text-line"]')
  await expect(lines).toHaveCount(1)
  await expect(lines.first()).toHaveText('Hello board')
})

test('typing more text grows the height, across edit sessions', async ({ page }) => {
  await page.goto(`/#room=text-grow-${Date.now()}`)
  const text = await createText(page)

  await typeAndCommit(page, text, 'One short line')
  await expect(text.locator('[data-testid="text-line"]')).toHaveCount(1)
  const oneLine = await heightOf(text)

  await reopen(text)
  await typeAndCommit(page, text, 'One short line\nand a second line\nand a third line')
  await expect(text.locator('[data-testid="text-line"]')).toHaveCount(3)
  const threeLines = await heightOf(text)

  expect(threeLines).toBeGreaterThan(oneLine)
  // LINE_HEIGHT (1.35) is spelled out here rather than imported: it is the
  // on-screen contract `text-layout.ts` publishes, not an implementation
  // detail this test needs to reach into the source to check.
  const lineHeight = 16 * 1.35
  expect(oneLine).toBeCloseTo(lineHeight, 0)
  expect(threeLines).toBeCloseTo(lineHeight * 3, 0)
})

test('widening from the east handle reflows the text and shrinks the height', async ({ page }) => {
  await page.goto(`/#room=text-resize-${Date.now()}`)
  const text = await createText(page)

  // Many short words at the default 240px width wraps onto several lines
  // regardless of exactly how wide any one real font renders "wrap".
  const words = Array(24).fill('wrap').join(' ')
  await typeAndCommit(page, text, words)

  const linesBefore = await text.locator('[data-testid="text-line"]').count()
  expect(linesBefore).toBeGreaterThan(1)
  const widthBefore = await widthOf(text)
  const heightBefore = await heightOf(text)

  const handle = text.getByRole('button', { name: 'Resize from right edge' })
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 260, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()

  const linesAfter = await text.locator('[data-testid="text-line"]').count()
  const widthAfter = await widthOf(text)
  const heightAfter = await heightOf(text)

  expect(widthAfter).toBeGreaterThan(widthBefore)
  expect(linesAfter).toBeLessThan(linesBefore)
  // Height follows the line count directly — no padding, no independent
  // vertical size to fall out of sync with it.
  expect(heightAfter).toBeLessThan(heightBefore)
})

test('a text object offers only the east and west resize handles', async ({ page }) => {
  await page.goto(`/#room=text-handles-${Date.now()}`)
  const text = await createText(page)
  await typeAndCommit(page, text, 'Any text at all')

  await expect(text.getByRole('button', { name: 'Resize from right edge' })).toBeVisible()
  await expect(text.getByRole('button', { name: 'Resize from left edge' })).toBeVisible()

  // Text derives its height from its content, so a vertical handle would be
  // a control that looks live and does nothing (src/lib/resize.ts).
  for (const label of [
    'Resize from top edge',
    'Resize from bottom edge',
    'Resize from top left corner',
    'Resize from top right corner',
    'Resize from bottom right corner',
    'Resize from bottom left corner',
  ]) {
    await expect(text.getByRole('button', { name: label })).toHaveCount(0)
  }
})

test('emptying the text deletes the object', async ({ page }) => {
  await page.goto(`/#room=text-empty-${Date.now()}`)
  const text = await createText(page)
  await typeAndCommit(page, text, 'Temporary')
  await expect(text).toBeVisible()

  await reopen(text)
  await typeAndCommit(page, text, '')

  await expect(text).toHaveCount(0)
})

test('the text colour control recolours the text', async ({ page }) => {
  await page.goto(`/#room=text-colour-${Date.now()}`)
  const text = await createText(page)
  await typeAndCommit(page, text, 'Colour me')

  await openTextColourPanel(page)
  await page.getByRole('button', { name: 'Red', exact: true }).click()

  await expect(text.locator('[data-testid="text-line"]').first()).toHaveCSS(
    'color',
    'rgb(220, 38, 38)'
  )
})

test('an export carries the same wrapped line breaks as the screen', async ({ page }) => {
  // The unit-level anti-divergence check (test/board-export.test.ts) compares
  // layoutText(...) directly against boardToSvg(...) — but boardToSvg's
  // textSvg calls layoutText itself, so that only proves layoutText agrees
  // with layoutText, not that the canvas and the export agree. This is the
  // genuine end-to-end check: real on-screen `text-line` nodes against the
  // real exported SVG. It only exercises the wrap width — the thing the
  // anti-divergence guarantee actually promises — when the text is long
  // enough to genuinely wrap, so this uses the same "many short words" idiom
  // as the resize test above (`:133`) to force a real wrap at the default
  // 240px width. (A prior version of this test used only hard newlines,
  // which split before `wrapParagraph` is ever reached — the wrap width
  // never mattered, and a canvas laid out 20px narrower than the export
  // still passed every test in the suite, this one included.)
  await captureExportedSvg(page)

  await page.goto(`/#room=text-export-wrap-${Date.now()}`)
  const text = await createText(page)
  // Not the resize test's "wrap" — at the real Inter metrics this suite
  // renders with, six-word and seven-word "wrap" lines straddle 250px, so a
  // 240-vs-220 width difference (the shape of the actual regression) lands on
  // the same side of the boundary for both and this text cannot tell them
  // apart. "text" lines up seven words at ~225px and six at ~192px — squarely
  // between 220 and 240 — so a canvas laid out 20px narrower groups every
  // line into sixes while the export groups into sevens. Verified by
  // deliberately mutating the canvas layout width (see this task's report)
  // and confirming this exact assertion fails.
  const words = Array(24).fill('text').join(' ')
  await typeAndCommit(page, text, words)

  const onScreenLines = await text.locator('[data-testid="text-line"]').allTextContents()
  expect(onScreenLines.length).toBeGreaterThan(1)

  const svg = await exportAndReadSvg(page)
  expect(tspanLines(svg)).toEqual(onScreenLines)
})

test('an export carries the same explicit line breaks as the screen', async ({ page }) => {
  // Kept alongside the wrapped case above rather than replaced by it —
  // explicit newlines are their own path through layoutText (split before
  // wrapParagraph runs at all) and deserve their own coverage, even though
  // this case alone cannot prove the wrap width agrees between the canvas
  // and the export.
  await captureExportedSvg(page)

  await page.goto(`/#room=text-export-${Date.now()}`)
  const text = await createText(page)
  await typeAndCommit(page, text, 'First line\nSecond line\nThird line')

  const onScreenLines = await text.locator('[data-testid="text-line"]').allTextContents()
  expect(onScreenLines).toEqual(['First line', 'Second line', 'Third line'])

  const svg = await exportAndReadSvg(page)
  expect(tspanLines(svg)).toEqual(onScreenLines)
})

test('Escape on a freshly created, never-typed object deletes it', async ({ page }) => {
  await page.goto(`/#room=text-escape-ghost-${Date.now()}`)
  await page.getByRole('button', { name: 'Text' }).click()
  await page.getByRole('region', { name: CANVAS }).click({ position: textSpot(page) })

  const text = page.locator('[data-testid^="text-"]')
  await expect(text).toHaveCount(1)
  await expect(text.getByRole('textbox')).toBeFocused()

  await page.keyboard.press('Escape')

  await expect(text).toHaveCount(0)
})

test('Escape on an object with committed text keeps the object and its text', async ({ page }) => {
  await page.goto(`/#room=text-escape-keep-${Date.now()}`)
  const text = await createText(page)
  await typeAndCommit(page, text, 'Keep me')

  await reopen(text)
  await text.getByRole('textbox').fill('Keep me, edited')
  // Never committed: Escape abandons the in-progress draft, not the object
  // that already has real text behind it.
  await page.keyboard.press('Escape')

  await expect(text).toHaveCount(1)
  await expect(text.getByRole('textbox')).toHaveCount(0)
  await expect(text.locator('[data-testid="text-line"]').first()).toHaveText('Keep me')
})

test('a click on dead canvas space closes the open Shape flyout', async ({ page }) => {
  // This depends on the browser's native default pointerdown action moving
  // focus to the (tabIndex=0) canvas region after React's own listeners run
  // — jsdom dispatches no such default action, so this class of bug is
  // invisible to a component test (STU-953 traps).
  await page.goto(`/#room=text-flyout-dismiss-${Date.now()}`)

  await page.getByRole('button', { name: 'Shape' }).click()
  const flyout = page.getByRole('group', { name: 'Shapes' })
  await expect(flyout).toBeVisible()

  // Dead space: clear of the toolbar (fixed to the bottom) and of the
  // flyout itself, which opens just above its trigger.
  await page.getByRole('region', { name: CANVAS }).click({ position: { x: 220, y: 150 } })

  await expect(flyout).toHaveCount(0)
})
