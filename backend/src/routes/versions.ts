import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

async function assertMember(userId: string, workspaceId: string) {
  return prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}

// GET /api/versions/:documentId — list snapshots, newest first
router.get("/:documentId", async (req: AuthedRequest, res) => {
  const document = await prisma.document.findUnique({ where: { id: req.params.documentId } });
  if (!document) return res.status(404).json({ error: "Document not found" });

  const membership = await assertMember(req.userId as string, document.workspaceId);
  if (!membership) return res.status(403).json({ error: "Not authorized" });

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: req.params.documentId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true, createdById: true },
  });
  res.json({ versions });
});

// POST /api/versions/:documentId — manually save a snapshot of current content
router.post("/:documentId", async (req: AuthedRequest, res) => {
  const document = await prisma.document.findUnique({ where: { id: req.params.documentId } });
  if (!document) return res.status(404).json({ error: "Document not found" });

  const membership = await assertMember(req.userId as string, document.workspaceId);
  if (!membership || membership.role === "VIEWER") {
    return res.status(403).json({ error: "Not authorized to save a version" });
  }

  const version = await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      title: document.title,
      content: document.content,
      createdById: req.userId as string,
    },
  });

  res.status(201).json({ version: { id: version.id, createdAt: version.createdAt } });
});

// POST /api/versions/:documentId/:versionId/restore — copy a snapshot back into the live document
router.post("/:documentId/:versionId/restore", async (req: AuthedRequest, res) => {
  const document = await prisma.document.findUnique({ where: { id: req.params.documentId } });
  if (!document) return res.status(404).json({ error: "Document not found" });

  const membership = await assertMember(req.userId as string, document.workspaceId);
  if (!membership || membership.role === "VIEWER") {
    return res.status(403).json({ error: "Not authorized to restore a version" });
  }

  const version = await prisma.documentVersion.findUnique({ where: { id: req.params.versionId } });
  if (!version || version.documentId !== document.id) {
    return res.status(404).json({ error: "Version not found" });
  }

  // NOTE: this restores the plain Document.content field used for snapshots.
  // It does NOT rewrite the live Yjs document that open collaborators are
  // editing — that would require broadcasting a Yjs update through the
  // WebSocket provider. For a portfolio project, restoring the saved
  // snapshot and asking the user to refresh is an accepted simplification;
  // worth stating explicitly in your README rather than presenting it as
  // seamless live-restore.
  const updated = await prisma.document.update({
    where: { id: document.id },
    data: { title: version.title, content: version.content },
  });

  res.json({ document: updated });
});

export default router;