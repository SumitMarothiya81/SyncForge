# AI Workspace — Phase 1 Scaffold

Real-time collaborative document platform with AI features, built incrementally.
This scaffold covers **Phase 1**: auth, workspaces, document CRUD, and a working
rich-text editor. Real-time sync (Yjs), RAG chat, and other AI features are
deliberately not wired up yet — see the roadmap below.

## Structure

```
ai-workspace/
├── backend/          Express + TypeScript + Prisma API
│   ├── prisma/schema.prisma
│   └── src/
│       ├── routes/    auth.ts, workspaces.ts, documents.ts
│       ├── middleware/auth.ts   JWT verification
│       └── lib/prisma.ts
├── frontend/          Next.js (App Router) + TypeScript + Tailwind
│   └── app/
│       ├── page.tsx           login
│       ├── signup/page.tsx
│       ├── dashboard/page.tsx workspace + document list
│       └── document/[id]/page.tsx   TipTap editor + autosave
└── docker-compose.yml Postgres + Redis for local dev
```

## Getting started

1. Start Postgres + Redis:
   ```
   docker compose up -d
   ```

2. Backend:
   ```
   cd backend
   cp .env.example .env      # edit JWT_SECRET
   npm install
   npm run prisma:migrate    # creates tables
   npm run dev               # http://localhost:4000
   ```

3. Frontend:
   ```
   cd frontend
   cp .env.local.example .env.local
   npm install
   npm run dev                # http://localhost:3000
   ```

4. Visit `http://localhost:3000`, sign up, and you'll land in a personal
   workspace created automatically at signup. Create a document and start typing —
   it autosaves 800ms after you stop.

## What's intentionally NOT here yet

- **Real-time collaboration.** The `Document.content` field is a plain string
  updated via PATCH. Phase 2 introduces Yjs + y-prosemirror + a WebSocket
  provider, replacing this with CRDT-based sync and live cursors.
- **AI features** (RAG chat, summarization, action items, Mermaid diagrams).
  These are Phase 3 and will hang off new routes (e.g. `/api/ai/chat`) backed
  by pgvector for retrieval.
- **Version history, comments, notifications.** Phase 4 polish.

## Design notes for interviews

- Roles are enforced server-side per workspace (`OWNER` / `EDITOR` / `VIEWER`)
  rather than trusted from the client — see `assertMember` in `documents.ts`.
- Every new user gets a personal workspace at signup so the "workspace" concept
  doesn't require a separate onboarding flow to demo.
- The editor component is deliberately isolated (`components/Editor.tsx`) so
  swapping its persistence model (plain HTML → Yjs doc) in Phase 2 doesn't
  require touching the page-level autosave logic.
