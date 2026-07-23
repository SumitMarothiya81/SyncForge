"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

interface EditorProps {
  documentId: string;
  userName: string;
  initialContent: string;
  onSnapshot: (html: string) => void;
}
export interface EditorHandle {
  getHTML: () => string;
  setHTML: (html: string) => void;
}
const CURSOR_COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#38bdf8", "#a78bfa", "#f472b6"];

// Weeks 6-7: content sync now lives in a Yjs doc, not a controlled React
// string. StarterKit's own history is disabled because Yjs's CRDT handles
// undo/redo across collaborators; letting both track history causes conflicts.
const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { documentId, userName, initialContent, onSnapshot },
  ref
) {
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [synced, setSynced] = useState(false);

  // Stable per-tab color, generated once, not re-rolled on every render
  const colorRef = useRef(CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]);

  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/^http/, "ws");
    const p = new WebsocketProvider(`${wsUrl}/yjs`, documentId, ydoc);

    p.on("sync", (isSynced: boolean) => setSynced(isSynced));
    setProvider(p);

    return () => {
      p.destroy();
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, ydoc]);

  // Runs on mount AND whenever userName updates (e.g. once api.me() resolves),
  // so the cursor label never gets stuck showing a fallback client ID.
  useEffect(() => {
    if (!provider) return;
    provider.awareness.setLocalStateField("user", {
      name: userName || "Anonymous",
      color: colorRef.current,
    });
  }, [provider, userName]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ history: false }),
        ...(provider
          ? [
              Collaboration.configure({ document: ydoc }),
              CollaborationCursor.configure({ provider }),
            ]
          : []),
      ],
      editorProps: {
        attributes: {
          class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[60vh]",
        },
      },
    },
    [provider]
  );
useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() ?? "",
    // Force-overwrites the live Yjs document, unlike the seed effect below
    // which only applies when the doc is empty. Used after an explicit
    // restore, where we want the restored content to win regardless of
    // what's currently in the live collaborative session.
    setHTML: (html: string) => {
      editor?.commands.setContent(html);
    },
  }));
  
  // If this browser is the very first one to ever open this document
  // (the Yjs doc is still empty), seed it from whatever was last saved
  // to Postgres, so old content isn't lost. initialContent is a real
  // dependency here — the parent's document fetch can resolve AFTER the
  // Yjs socket has already synced, so this effect must re-run when
  // initialContent arrives late, or the seed never happens at all.
  useEffect(() => {
    if (!editor || !synced) return;
    const fragment = ydoc.getXmlFragment("default");
    if (fragment.length === 0 && initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, synced, initialContent, ydoc]);

  // Periodic durability snapshot to Postgres — independent of the live
  // Yjs sync between browsers. This is what survives a server restart.
  useEffect(() => {
    if (!editor) return;
    const interval = setInterval(() => onSnapshot(editor.getHTML()), 5000);
    return () => clearInterval(interval);
  }, [editor, onSnapshot]);

  return (
    <div className="border border-ink/10 rounded-md px-6 py-4 bg-white">
      {!synced && <p className="text-xs text-ink/40 mb-2">Connecting...</p>}
      <EditorContent editor={editor} />
    </div>
  );
});

export default Editor;