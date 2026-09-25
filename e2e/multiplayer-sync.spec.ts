import { test, expect, type Page } from '@playwright/test'

/**
 * Two tabs, one board: proves elements and presence travel over the Yjs
 * websocket relay rather than only living in each tab's local IndexedDB.
 *
 * Each test uses a fresh room name so runs cannot inherit persisted state.
 */

const CANVAS = /Interactive canvas workspace/

function boardUrl(room: string) {
  return `/#room=${room}`
}

function uniqueRoom(label: string) {
  return `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

async function openBoard(page: Page, room: string) {
  await page.goto(boardUrl(room))
  await expect(page.getByRole('region', { name: CANVAS })).toBeVisible()
}

async function createSticky(page: Page, position: { x: number; y: number }) {
  await page.getByRole('button', { name: 'Sticky note' }).click()
  await page.getByRole('region', { name: CANVAS }).click({ position })
  await page.getByRole('button', { name: 'Select' }).click()
}

/**
 * Creates a text object and returns its id, pinned immediately rather than
 * kept as a live `.last()` locator — a second element drawn later would
 * otherwise silently re-point it (see docs/context/STU-953.md's traps).
 * Unlike `createSticky`, text lands already in edit mode with an empty,
 * auto-focused textarea (STU-953), and the tool already resets to Select
 * internally — clicking the Select button here, the way `createSticky` does,
 * would blur that textarea and commit its empty draft, deleting the object
 * before this function ever returns it.
 */
async function createText(page: Page, position: { x: number; y: number }): Promise<string> {
  await page.getByRole('button', { name: 'Text' }).click()
  await page.getByRole('region', { name: CANVAS }).click({ position })

  const newest = page.locator('[data-testid^="text-"]').last()
  await expect(newest).toBeVisible()
  return (await newest.getAttribute('data-testid'))!.replace('text-', '')
}

/** Viewport-aware spot so both the desktop and mobile Playwright projects
 * click somewhere the text object actually lands, mirroring the shape used
 * in e2e/text-object.spec.ts and e2e/fill-pattern.spec.ts for STU-927. */
function textSpot(page: Page) {
  const width = page.viewportSize()?.width ?? 1280
  return { x: width >= 700 ? 300 : 200, y: 220 }
}

/** Dead canvas space, far enough from `textSpot` on both viewport sizes that
 * clicking here can never land on the text object itself. */
function deadSpot(page: Page) {
  const width = page.viewportSize()?.width ?? 1280
  return { x: width - 40, y: 120 }
}

test.describe('multiplayer sync', () => {
  test('a sticky note created in one tab appears in the other', async ({ browser }) => {
    const room = uniqueRoom('element')
    const [contextA, contextB] = await Promise.all([browser.newContext(), browser.newContext()])
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      await openBoard(pageA, room)
      await openBoard(pageB, room)

      await expect(pageB.locator('[data-testid^="sticky-"]')).toHaveCount(0)

      await createSticky(pageA, { x: 300, y: 260 })

      await expect(pageA.locator('[data-testid^="sticky-"]')).toHaveCount(1)
      await expect(pageB.locator('[data-testid^="sticky-"]')).toHaveCount(1, { timeout: 10_000 })
    } finally {
      await Promise.all([contextA.close(), contextB.close()])
    }
  })

  test('sticky note text edited in one tab propagates to the other', async ({ browser }) => {
    const room = uniqueRoom('text')
    const [contextA, contextB] = await Promise.all([browser.newContext(), browser.newContext()])
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      await openBoard(pageA, room)
      await openBoard(pageB, room)

      await createSticky(pageA, { x: 320, y: 240 })
      const sticky = pageA.locator('[data-testid^="sticky-"]').first()
      await expect(sticky).toBeVisible()

      await sticky.dblclick()
      await pageA.getByRole('textbox').fill('Shared idea')
      // Blur commits the edit into the CRDT.
      await pageA.keyboard.press('Tab')

      await expect(pageB.getByText('Shared idea')).toBeVisible({ timeout: 10_000 })
    } finally {
      await Promise.all([contextA.close(), contextB.close()])
    }
  })

  test('each tab sees the other as an active user', async ({ browser }) => {
    const room = uniqueRoom('presence')
    const [contextA, contextB] = await Promise.all([browser.newContext(), browser.newContext()])
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      await openBoard(pageA, room)
      await openBoard(pageB, room)

      await expect(pageA.getByRole('group', { name: /other user/ })).toBeVisible({
        timeout: 10_000,
      })
      await expect(pageB.getByRole('group', { name: /other user/ })).toBeVisible({
        timeout: 10_000,
      })
    } finally {
      await Promise.all([contextA.close(), contextB.close()])
    }
  })

  test('a text object created in one tab is not auto-focused, and surviving it, in the other', async ({
    browser,
  }) => {
    // STU-953 critical fix regression lock. Edit mode used to be derived
    // from shared document data (`element.text === ''`), so every peer's
    // `elementsMap` sync mounted the freshly created empty object straight
    // into edit mode and auto-focused its textarea — on every tab, not just
    // the one that created it. B's next click elsewhere then blurred that
    // unwanted textarea, committing its still-empty draft and deleting A's
    // in-progress object out from under it. This is the case that would have
    // caught it: real two-tab focus and real deletion, neither of which
    // jsdom can observe.
    const room = uniqueRoom('text-focus')
    const [contextA, contextB] = await Promise.all([browser.newContext(), browser.newContext()])
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      await openBoard(pageA, room)
      await openBoard(pageB, room)

      const id = await createText(pageA, textSpot(pageA))
      const textOnA = pageA.locator(`[data-testid="text-${id}"]`)
      const textOnB = pageB.locator(`[data-testid="text-${id}"]`)
      await expect(textOnB).toBeVisible({ timeout: 10_000 })

      // B touched nothing — it must not have inherited A's edit mode.
      await expect(pageB.getByRole('textbox')).toHaveCount(0)

      // B clicks dead canvas space, nowhere near A's object.
      await pageB.getByRole('region', { name: CANVAS }).click({ position: deadSpot(pageB) })

      // A's object must still be standing on both tabs — B's click must not
      // have deleted it.
      await expect(textOnB).toBeVisible()
      await expect(textOnA).toBeVisible()
    } finally {
      await Promise.all([contextA.close(), contextB.close()])
    }
  })
})
