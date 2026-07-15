import { Server as HTTPServer } from "http";
import { WebSocketServer } from "ws";
// y-websocket ships setupWSConnection in its bin/utils, without type defs —
// that's expected, hence the ts-ignore.
// @ts-ignore
import { setupWSConnection } from "y-websocket/bin/utils";

/**
 * WEEKS 6-7 — the real document sync, replacing plain-string autosave.
 * Yjs handles conflict resolution (CRDT) so simultaneous edits from multiple
 * clients merge correctly without a "last write wins" race. This is
 * deliberately a SEPARATE upgrade path (/yjs/<documentId>) from Socket.IO's
 * own path, so both can share the same HTTP server without colliding.
 *
 * NOTE ON PERSISTENCE: setupWSConnection keeps each document's Yjs state
 * in memory only. If the server restarts, in-flight edits since the last
 * Postgres snapshot (see Editor.tsx's onSnapshot) are lost. That's an
 * accepted limitation until Phase 4 (version history) adds proper
 * Yjs-state persistence.
 */
export function attachYjsServer(httpServer: HTTPServer) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (conn, req) => {
    setupWSConnection(conn, req);
  });

  httpServer.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url || "", "http://localhost");
    if (pathname.startsWith("/yjs")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
    // Socket.IO registers its own 'upgrade' listener for its own path
    // (/socket.io/) when it's attached to this same httpServer — it ignores
    // requests that don't match, so this coexists safely.
  });

  return wss;
}