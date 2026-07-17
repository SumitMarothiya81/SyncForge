"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function DiagramPanel({ documentId }: { documentId: string }) {
  const [instruction, setInstruction] = useState("");
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSvg(null);
    try {
      const { mermaid: mermaidCode } = await api.generateDiagram(documentId, instruction || undefined);
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme: "neutral" });
      const { svg } = await mermaid.render(`diagram-${Date.now()}`, mermaidCode);
      setSvg(svg);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Diagram generation failed — the AI may have produced invalid Mermaid syntax"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-ink/10 rounded-md bg-white p-4">
      <span className="text-sm font-medium">Diagram</span>

      <div className="flex gap-2 mt-2 mb-3">
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Optional: describe what to diagram (e.g. 'show the RAG pipeline as a flowchart')"
          className="flex-1 rounded-md border border-ink/15 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs rounded-md bg-accent text-white px-3 py-2 disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {svg && (
        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </div>
  );
}