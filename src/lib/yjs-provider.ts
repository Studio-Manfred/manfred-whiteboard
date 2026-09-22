import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { createWhiteboardDoc, type BoardElement } from '../types/whiteboard'

export interface WhiteboardConnection {
  doc: Y.Doc
  elementsMap: Y.Map<BoardElement>
  elementOrder: Y.Array<string>
  undoManager: Y.UndoManager
  wsProvider: WebsocketProvider | null
  indexeddbProvider: IndexeddbPersistence | null
  awareness: WebsocketProvider['awareness'] | null
  destroy: () => void
}

/**
 * Local relay endpoint. Must track `server/ws-server.mjs` (PORT 4444) — they
 * drifted apart once and multiplayer silently never connected.
 */
export const DEV_WS_URL = 'ws://localhost:4444'

/**
 * Which relay to talk to, or `null` for a local-only board.
 *
 * A built app with no `VITE_WS_URL` has no relay to reach: falling back to
 * localhost there would point every visitor's browser at port 4444 on *their
 * own machine* and retry forever. So the fallback is development-only, and a
 * deployment without a configured relay simply runs local-only.
 */
export function resolveWsUrl(
  configured: string | undefined = import.meta.env.VITE_WS_URL,
  isDev: boolean = import.meta.env.DEV
): string | null {
  if (configured?.trim()) return configured
  return isDev ? DEV_WS_URL : null
}

/**
 * Derives a clean room name from the URL hash (e.g. #room=sprint-planning), falling back to 'default-room'.
 */
export function getRoomFromUrl(): string {
  if (typeof window === 'undefined') return 'default-room'
  const hash = window.location.hash.replace(/^#/, '')
  const params = new URLSearchParams(hash)
  return params.get('room') || 'default-room'
}

/**
 * Initializes local Y.Doc, IndexedDB cache, and optional WebSocket multiplayer connection.
 */
export function initWhiteboardConnection(
  roomName: string = getRoomFromUrl(),
  wsUrl: string | null = resolveWsUrl(),
  enableRemote: boolean = true
): WhiteboardConnection {
  const { doc, elementsMap, elementOrder } = createWhiteboardDoc()
  const undoManager = new Y.UndoManager([elementsMap, elementOrder])

  let indexeddbProvider: IndexeddbPersistence | null = null
  if (typeof window !== 'undefined' && window.indexedDB) {
    indexeddbProvider = new IndexeddbPersistence(`manfred-whiteboard-${roomName}`, doc)
  }

  let wsProvider: WebsocketProvider | null = null
  let awareness: WebsocketProvider['awareness'] | null = null

  if (enableRemote && wsUrl && typeof window !== 'undefined') {
    try {
      wsProvider = new WebsocketProvider(wsUrl, roomName, doc)
      awareness = wsProvider.awareness
    } catch (e) {
      console.warn('Could not connect to WebSocket server, using local-only sync:', e)
    }
  }

  const destroy = () => {
    undoManager.destroy()
    wsProvider?.destroy()
    indexeddbProvider?.destroy()
    doc.destroy()
  }

  return {
    doc,
    elementsMap,
    elementOrder,
    undoManager,
    wsProvider,
    indexeddbProvider,
    awareness,
    destroy,
  }
}
