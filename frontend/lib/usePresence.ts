"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface PresenceUser {
  socketId: string;
  userId: string;
  name: string;
}

export function usePresence(documentId: string, currentUserName: string) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!documentId || !currentUserName) return;

    const token = localStorage.getItem("token");
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("presence:join", { documentId, name: currentUserName });
    });

    socket.on("presence:update", (users: PresenceUser[]) => {
      setOnlineUsers(users);
    });

    socket.on(
      "presence:typing",
      ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
        setTypingUserIds((prev) => {
          const next = new Set(prev);
          if (isTyping) next.add(userId);
          else next.delete(userId);
          return next;
        });
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [documentId, currentUserName]);

  function notifyTyping() {
    socketRef.current?.emit("presence:typing", { documentId, isTyping: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit("presence:typing", { documentId, isTyping: false });
    }, 1500);
  }

  return { onlineUsers, typingUserIds, notifyTyping };
}