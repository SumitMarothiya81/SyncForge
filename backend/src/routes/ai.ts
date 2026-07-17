import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { chunkText, stripHtml } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { streamChatCompletion, getChatCompletion } from "../lib/groq";

const router = Router();
router.use(requireAuth);

async function assertMember(userId: string, workspaceId: string) {
  return prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

router.post("/index/:documentId", async (req: AuthedRequest, res) => {
  const document = await prisma.document.findUnique({ where: { id: req.params.documentId } });
  if (!document) return res.status(404).json({ error: "Document not found" });

  const membership = await assertMember(req.userId as string, document.workspaceId);
  if (!membership) return res.status(403).json({ error: "Not authorized" });

  const plainText = stripHtml(document.content);
  const chunks = chunkText(plainText);

  if (chunks.length === 0) {
    return res.status(400).json({ error: "Document has no content to index yet" });
  }

  await prisma.$executeRawUnsafe(`DELETE FROM "DocumentChunk" WHERE "documentId" = $1`, document.id);

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedText(chunks[i]);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DocumentChunk" (id, "documentId", content, "chunkIndex", embedding, "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, now())`,
      document.id,
      chunks[i],
      i,
      toVectorLiteral(embedding)
    );
  }

  res.json({ chunksIndexed: chunks.length });
});

const chatSchema = z.object({ question: z.string().min(1) });

router.post("/chat/:documentId", async (req: AuthedRequest, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const document = await prisma.document.findUnique({ where: { id: req.params.documentId } });
  if (!document) return res.status(404).json({ error: "Document not found" });

  const membership = await assertMember(req.userId as string, document.workspaceId);
  if (!membership) return res.status(403).json({ error: "Not authorized" });

  const questionEmbedding = await embedText(parsed.data.question);

  const results = await prisma.$queryRawUnsafe<{ content: string }[]>(
    `SELECT content FROM "DocumentChunk"
     WHERE "documentId" = $1
     ORDER BY embedding <=> $2::vector
     LIMIT 5`,
    document.id,
    toVectorLiteral(questionEmbedding)
  );

  if (results.length === 0) {
    return res.status(400).json({
      error: "This document hasn't been indexed yet — click 'Sync for AI' first",
    });
  }

  const context = results.map((r, i) => `[Excerpt ${i + 1}]\n${r.content}`).join("\n\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    await streamChatCompletion(
      [
        {
          role: "system",
          content:
            "Answer the user's question using ONLY the excerpts below from their document. " +
            "If the excerpts don't contain the answer, say so honestly rather than guessing.\n\n" +
            context,
        },
        { role: "user", content: parsed.data.question },
      ],
      (token) => res.write(token)
    );
  } catch (err) {
    res.write("\n\n[Error: the AI response was interrupted]");
  } finally {
    res.end();
  }
});



// POST /api/ai/action-items/:documentId
router.post("/action-items/:documentId", async (req: AuthedRequest, res) => {
  const document = await prisma.document.findUnique({ where: { id: req.params.documentId } });
  if (!document) return res.status(404).json({ error: "Document not found" });

  const membership = await assertMember(req.userId as string, document.workspaceId);
  if (!membership) return res.status(403).json({ error: "Not authorized" });

  const plainText = stripHtml(document.content).slice(0, 6000); // keep prompt small & fast
  if (!plainText) return res.status(400).json({ error: "Document has no content yet" });

  const raw = await getChatCompletion([
    {
      role: "system",
      content:
        "Extract action items from the document below. Respond with ONLY a JSON array, " +
        'no markdown fences, no commentary. Format: [{"task": "...", "assignee": "" or a name if mentioned}]. ' +
        "If there are no clear action items, return an empty array [].",
    },
    { role: "user", content: plainText },
  ]);

  try {
    // Strip accidental ```json fences before parsing, in case the model adds them anyway
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const items = JSON.parse(cleaned);
    res.json({ items });
  } catch {
    res.status(502).json({ error: "AI response wasn't valid JSON — try again" });
  }
});

// POST /api/ai/diagram/:documentId
const diagramSchema = z.object({ instruction: z.string().optional() });

router.post("/diagram/:documentId", async (req: AuthedRequest, res) => {
  const parsed = diagramSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const document = await prisma.document.findUnique({ where: { id: req.params.documentId } });
  if (!document) return res.status(404).json({ error: "Document not found" });

  const membership = await assertMember(req.userId as string, document.workspaceId);
  if (!membership) return res.status(403).json({ error: "Not authorized" });

  const plainText = stripHtml(document.content).slice(0, 6000);
  if (!plainText) return res.status(400).json({ error: "Document has no content yet" });

  const instruction =
    parsed.data.instruction || "Summarize the structure or flow of this document as a diagram.";

  const raw = await getChatCompletion([
    {
      role: "system",
      content:
        "Generate a Mermaid diagram based on the document below. Respond with ONLY the Mermaid " +
        "syntax (e.g. starting with 'flowchart TD' or 'graph TD'), no markdown fences, no commentary.",
    },
    { role: "user", content: `Instruction: ${instruction}\n\nDocument:\n${plainText}` },
  ]);

  const mermaid = raw.replace(/```mermaid|```/g, "").trim();
  res.json({ mermaid });
});

export default router;


