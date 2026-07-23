# SyncForge — AI-Powered Collaborative Workspace

A real-time collaborative document editor with AI built in — not a Google Docs clone, but a workspace where documents, live collaboration, and AI assistance are one connected system.

## What this is

SyncForge lets teams write documents together in real time, with live cursors and no merge conflicts (thanks to CRDT-based sync via Yjs), and layers AI directly on top: chat with your document, extract action items, generate diagrams from content, and roll back to earlier versions — all running on a completely free stack (Groq's Llama 3.3 70B + a locally-run embedding model, no paid API keys required).

## Features

**Core**

- JWT authentication, workspaces, and role-based permissions (Owner / Editor / Viewer)
- Real-time collaborative editing (Yjs CRDT + TipTap), with live named cursors per user
- Presence indicators (who's online, who's typing)
- Version history with save/restore, live-applied through the active collaborative session
- Debounced autosave

**AI (Groq + local embeddings — zero-cost inference)**

- Chat with your document (RAG: chunking → local embeddings via Xenova/all-MiniLM-L6-v2 → pgvector similarity search → Groq-generated, grounded answers)
- Action-item extraction (structured JSON → interactive checklist)
- AI-generated Mermaid diagrams from document content

## Tech stack

| Layer     | Tech                                                                     |
| --------- | ------------------------------------------------------------------------ |
| Frontend  | Next.js (App Router), TypeScript, Tailwind CSS, TipTap                   |
| Backend   | Node.js, Express, Prisma, PostgreSQL + pgvector                          |
| Real-time | Yjs, y-websocket, Socket.IO (presence)                                   |
| AI        | Groq API (Llama 3.3 70B), local Xenova embeddings (ONNX, runs on-device) |
| Infra     | Docker Compose (Postgres + Redis), GitHub Actions CI                     |

## Architecture
