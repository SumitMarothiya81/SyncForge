import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

interface PresenceUser {
  socketId: string;
  userId: string;
  name: string;
}

const roomPresence = new Map<string, Map<string, PresenceUser>>();

function getRoomUsers(documentId: string): PresenceUser[] {
  return Array.from(roomPresence.get(documentId)?.values() ?? []);
}

export function attachPresenceServer(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || "http://localhost:3000" },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
        sub: string;
      };
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    let currentRoom: string | null = null;

    socket.on("presence:join", ({ documentId, name }: { documentId: string; name: string }) => {
      currentRoom = documentId;
      socket.join(documentId);

      if (!roomPresence.has(documentId)) roomPresence.set(documentId, new Map());
      roomPresence.get(documentId)!.set(socket.id, {
        socketId: socket.id,
        userId: socket.data.userId,
        name,
      });

      io.to(documentId).emit("presence:update", getRoomUsers(documentId));
    });

    socket.on("presence:typing", ({ documentId, isTyping }: { documentId: string; isTyping: boolean }) => {
      socket.to(documentId).emit("presence:typing", {
        socketId: socket.id,
        userId: socket.data.userId,
        isTyping,
      });
    });

    socket.on("disconnect", () => {
      if (!currentRoom) return;
      const room = roomPresence.get(currentRoom);
      room?.delete(socket.id);
      io.to(currentRoom).emit("presence:update", getRoomUsers(currentRoom));
    });
  });

  return io;
}