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
})
