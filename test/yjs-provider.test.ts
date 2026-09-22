import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  getRoomFromUrl,
  initWhiteboardConnection,
  resolveWsUrl,
  DEV_WS_URL,
} from '../src/lib/yjs-provider'

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

describe('resolveWsUrl', () => {
  it('uses the configured endpoint, in development or production', () => {
    expect(resolveWsUrl('wss://relay.example.com', true)).toBe('wss://relay.example.com')
    expect(resolveWsUrl('wss://relay.example.com', false)).toBe('wss://relay.example.com')
  })

  it('falls back to the local relay while developing', () => {
    expect(resolveWsUrl(undefined, true)).toBe(DEV_WS_URL)
  })

  it('returns null in a built app with no endpoint configured', () => {
    // Otherwise every visitor's browser hammers ws://localhost on their own machine.
    expect(resolveWsUrl(undefined, false)).toBeNull()
  })

  it('treats an empty or blank VITE_WS_URL as unset', () => {
    expect(resolveWsUrl('', false)).toBeNull()
    expect(resolveWsUrl('   ', false)).toBeNull()
  })
})

describe('initWhiteboardConnection without an endpoint', () => {
  it('never opens a socket when there is nothing to connect to', () => {
    const conn = initWhiteboardConnection('lonely-room', null)
    connections.push(conn)

    expect(conn.wsProvider).toBeNull()
    expect(conn.awareness).toBeNull()
  })

  it('still gives a fully usable local board', () => {
    const conn = initWhiteboardConnection('lonely-room', null)
    connections.push(conn)

    conn.doc.transact(() => {
      conn.elementOrder.push(['a'])
    })

    expect(conn.elementOrder.toArray()).toEqual(['a'])
    expect(() => conn.undoManager.undo()).not.toThrow()
  })
})

