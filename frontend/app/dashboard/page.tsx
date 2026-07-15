"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Workspace {
  id: string;
  name: string;
  role: string;
}

interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listWorkspaces()
      .then(({ workspaces }) => {
        setWorkspaces(workspaces);
        if (workspaces[0]) setActiveWorkspace(workspaces[0].id);
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!activeWorkspace) return;
    api.listDocuments(activeWorkspace).then(({ documents }) => setDocuments(documents));
  }, [activeWorkspace]);

  async function handleNewDocument() {
    if (!activeWorkspace) return;
    const { document } = await api.createDocument(activeWorkspace, "Untitled document");
    router.push(`/document/${document.id}`);
  }

  if (loading) return <main className="p-8 text-sm text-ink/60">Loading...</main>;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl">
            {workspaces.find((w) => w.id === activeWorkspace)?.name || "Your Workspace"}
          </h1>
          <p className="text-sm text-ink/60">Documents you can open and edit</p>
        </div>
        <button
          onClick={handleNewDocument}
          className="rounded-md bg-accent text-white text-sm px-4 py-2"
        >
          New document
        </button>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-ink/50">No documents yet — create your first one above.</p>
      ) : (
        <ul className="divide-y divide-ink/10 border border-ink/10 rounded-md">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                onClick={() => router.push(`/document/${doc.id}`)}
                className="w-full text-left px-4 py-3 hover:bg-ink/5 flex items-center justify-between"
              >
                <span className="text-sm">{doc.title}</span>
                <span className="text-xs text-ink/40">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
