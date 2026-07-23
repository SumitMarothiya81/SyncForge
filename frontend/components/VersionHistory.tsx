"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Version {
  id: string;
  title: string;
  createdAt: string;
}

export default function VersionHistory({
  documentId,
  onRestored,
  onBeforeSave,
}: {
  documentId: string;
  onRestored: () => void;
  onBeforeSave?: () => Promise<void>;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const { versions } = await api.listVersions(documentId);
      setVersions(versions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load versions");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // Flush the live editor content to Postgres first — otherwise this
      // reads whatever the last periodic autosave happened to catch, which
      // can be stale if you save right after typing.
      if (onBeforeSave) await onBeforeSave();
      await api.saveVersion(documentId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save version");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(versionId: string) {
    setRestoringId(versionId);
    setError(null);
    try {
      await api.restoreVersion(documentId, versionId);
      onRestored(); // parent re-fetches the document and refreshes the editor
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore version");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="border border-ink/10 rounded-md bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Version history</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs rounded-md bg-accent/10 text-accent px-2 py-1 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save version"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {versions.length === 0 ? (
        <p className="text-xs text-ink/40">
          No saved versions yet — click &quot;Save version&quot; to create a restore point.
        </p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {v.title} —{" "}
                <span className="text-ink/40 text-xs">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
              </span>
              <button
                onClick={() => handleRestore(v.id)}
                disabled={restoringId === v.id}
                className="text-xs text-accent disabled:opacity-50"
              >
                {restoringId === v.id ? "Restoring..." : "Restore"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}