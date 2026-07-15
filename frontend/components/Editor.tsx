"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
}

// Phase 1: local single-user editing, content persisted via PATCH /api/documents/:id
// Phase 2 will swap the StarterKit history extension for y-prosemirror bound to a
// Yjs doc, and this component starts receiving a `provider` prop for awareness/cursors.
export default function Editor({ content, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[60vh]",
      },
    },
  });

  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div className="border border-ink/10 rounded-md px-6 py-4 bg-white">
      <EditorContent editor={editor} />
    </div>
  );
}
