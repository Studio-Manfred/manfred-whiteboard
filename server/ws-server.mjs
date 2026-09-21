#!/usr/bin/env node

/**
 * Minimal y-websocket signaling server for local development.
 *
 * Usage:
 *   node server/ws-server.mjs          # starts on port 4444
 *   PORT=9999 node server/ws-server.mjs
 *
 * Rooms are auto-created from the URL fragment (e.g. ws://localhost:4444/room-name).
 */

import { WebSocketServer } from 'ws'
import http from 'node:http'

const PORT = parseInt(process.env.PORT || '4444', 10)

// y-websocket expects a setupWSConnection export
let setupWSConnection
try {
  const ywsUtils = await import('y-websocket/bin/utils')
  setupWSConnection = ywsUtils.setupWSConnection
} catch {
  console.error(
    '❌  Could not import y-websocket utilities. Make sure y-websocket is installed:\n' +
      '    npm install y-websocket ws'
  )
  process.exit(1)
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Manfred Whiteboard – y-websocket signaling server\n')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req)
})

server.listen(PORT, () => {
  console.log(`🟢  y-websocket server listening on ws://localhost:${PORT}`)
})
