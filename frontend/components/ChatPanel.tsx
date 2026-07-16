"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPanel({ documentId }: { documentId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleIndex() {
    setIndexing(true);
    setError(null);
    try {
      await api.indexDocument(documentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Indexing failed");
    } finally {
      setIndexing(false);
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      await api.streamChat(documentId, userMessage.content, (token) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + token,
          };
          return next;
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-ink/10 rounded-md bg-white flex flex-col h-[60vh]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-ink/10">
        <span className="text-sm font-medium">Chat with this document</span>
        <button
          onClick={handleIndex}
          disabled={indexing}
          className="text-xs rounded-md bg-accent/10 text-accent px-2 py-1 disabled:opacity-50"
        >
          {indexing ? "Syncing..." : "Sync for AI"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-ink/40">
            Click &quot;Sync for AI&quot; after saving content, then ask a question about this document.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={`inline-block rounded-md px-3 py-2 text-sm max-w-[85%] ${
                m.role === "user" ? "bg-accent text-white" : "bg-ink/5"
              }`}
            >
              {m.content || (loading && i === messages.length - 1 ? "..." : "")}
            </span>
          </div>
        ))}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <form onSubmit={handleAsk} className="flex gap-2 px-4 py-3 border-t border-ink/10">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this document..."
          className="flex-1 rounded-md border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-accent text-white text-sm px-4 py-2 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}