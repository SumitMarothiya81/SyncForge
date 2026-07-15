import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import workspaceRoutes from "./routes/workspaces";
import documentRoutes from "./routes/documents";
import { attachPresenceServer } from "./realtime/presence";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/documents", documentRoutes);

// NOTE: Real-time collaboration (Phase 2) will attach a WebSocket server
// (y-websocket or a custom provider) alongside this HTTP server, likely
// via http.createServer(app) + a ws.Server on the same port.

const server = http.createServer(app);
attachPresenceServer(server);

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
