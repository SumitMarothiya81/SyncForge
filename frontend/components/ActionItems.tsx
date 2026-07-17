"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface ActionItem {
  task: string;
  assignee?: string;
}

export default function ActionItems({ documentId }: { documentId: string }) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExtract() {
    setLoading(true);
    setError(null);
    try {
      const { items } = await api.getActionItems(documentId);
      setItems(items);
      setChecked(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <div className="border border-ink/10 rounded-md bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Action items</span>
        <button
          onClick={handleExtract}
          disabled={loading}
          className="text-xs rounded-md bg-accent/10 text-accent px-2 py-1 disabled:opacity-50"
        >
          {loading ? "Extracting..." : "Extract from document"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {items.length === 0 ? (
        <p className="text-xs text-ink/40">
          No action items yet — click &quot;Extract from document&quot;.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() => toggle(i)}
                className="mt-1"
              />
              <span className={checked.has(i) ? "line-through text-ink/40" : ""}>
                {item.task}
                {item.assignee && (
                  <span className="text-xs text-accent ml-2">({item.assignee})</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}