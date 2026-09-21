import { describe, it, expect, afterEach, vi } from 'vitest'
import { getRoomFromUrl, initWhiteboardConnection } from '../src/lib/yjs-provider'

const connections: Array<{ destroy: () => void }> = []

function connect(room: string) {
  // enableRemote=false keeps the test off the network; the websocket path is
  // covered end-to-end by e2e/multiplayer-sync.spec.ts.
  const conn = initWhiteboardConnection(room, 'ws://unused', false)
  connections.push(conn)
  return conn
}

afterEach(() => {
  while (connections.length) connections.pop()?.destroy()
  window.location.hash = ''
})

describe('getRoomFromUrl', () => {
  it('falls back to the default room when the URL says nothing', () => {
    window.location.hash = ''
    expect(getRoomFromUrl()).toBe('default-room')
  })

  it('reads the room from the hash', () => {
    window.location.hash = '#room=sprint-planning'
    expect(getRoomFromUrl()).toBe('sprint-planning')
  })

  it('reads the room from among other hash parameters', () => {
    window.location.hash = '#zoom=2&room=retro'
    expect(getRoomFromUrl()).toBe('retro')
  })

  it('falls back when the hash has no room parameter', () => {
    window.location.hash = '#zoom=2'
    expect(getRoomFromUrl()).toBe('default-room')
  })
})

describe('initWhiteboardConnection', () => {
  it('hands back a usable board document', () => {
    const conn = connect('test-room')

    expect(conn.doc).toBeDefined()
    expect(conn.elementsMap).toBeDefined()
    expect(conn.elementOrder).toBeDefined()
  })

  it('stays local when remote sync is disabled', () => {
    const conn = connect('test-room')

    expect(conn.wsProvider).toBeNull()
    expect(conn.awareness).toBeNull()
  })

  it('tracks changes for undo and redo', () => {
    const conn = connect('undo-room')

    conn.doc.transact(() => {
      conn.elementOrder.push(['a'])
    })
    expect(conn.elementOrder.toArray()).toEqual(['a'])

    conn.undoManager.undo()
    expect(conn.elementOrder.toArray()).toEqual([])

    conn.undoManager.redo()
    expect(conn.elementOrder.toArray()).toEqual(['a'])
  })

  it('defaults to the room named in the URL', () => {
    window.location.hash = '#room=from-the-url'
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const conn = initWhiteboardConnection(undefined, 'ws://unused', false)
    connections.push(conn)

    expect(conn.doc).toBeDefined()
    spy.mockRestore()
  })

  it('tears everything down without throwing', () => {
    const conn = initWhiteboardConnection('disposable', 'ws://unused', false)

    expect(() => conn.destroy()).not.toThrow()
  })
})
