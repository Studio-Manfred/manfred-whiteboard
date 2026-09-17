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

const DEFAULT_WS_URL = 'ws://localhost:1234'

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
  wsUrl: string = DEFAULT_WS_URL,
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

  if (enableRemote && typeof window !== 'undefined') {
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
