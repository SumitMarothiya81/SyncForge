"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Editor from "@/components/Editor";
import { usePresence } from "@/lib/usePresence";

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [userName, setUserName] = useState("");
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const { onlineUsers, typingUserIds, notifyTyping } = usePresence(id, userName);

  useEffect(() => {
    api.getDocument(id).then(({ document }) => {
      setTitle(document.title);
      setContent(document.content);
    });
    api.me().then(({ user }) => setUserName(user.name));
  }, [id]);

  function scheduleSave(next: { title?: string; content?: string }) {
    setStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      await api.updateDocument(id, next);
      setStatus("saved");
    }, 800);
  }
return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-2 text-xs text-ink/50">
        <div className="flex items-center gap-2">
          <span>Online:</span>
          {onlineUsers.length === 0 ? (
            <span>just you</span>
          ) : (
            onlineUsers.map((u) => (
              <span key={u.socketId} className="rounded-full bg-accent/10 text-accent px-2 py-0.5">
                {u.name}
                {typingUserIds.has(u.userId) && " · typing..."}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave({ title: e.target.value });
          }}
          className="font-display text-2xl bg-transparent focus:outline-none w-full"
        />
        <span className="text-xs text-ink/40 whitespace-nowrap ml-4">
          {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : ""}
        </span>
      </div>
<Editor
  documentId={id}
  userName={userName}
  initialContent={content}
  onSnapshot={(html) => {
    api.updateDocument(id, { content: html });
  }}
/>
    
    </main>
  );
}
 