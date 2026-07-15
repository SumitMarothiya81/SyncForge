import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

async function assertMember(userId: string, workspaceId: string) {
  return prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}

const createSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// List documents in a workspace
router.get("/", async (req: AuthedRequest, res) => {
  const workspaceId = req.query.workspaceId as string | undefined;
  if (!workspaceId) return res.status(400).json({ error: "workspaceId query param is required" });

  const membership = await assertMember(req.userId as string, workspaceId);
  if (!membership) return res.status(403).json({ error: "Not a member of this workspace" });

  const documents = await prisma.document.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, ownerId: true },
  });
  res.json({ documents });
});

router.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const membership = await assertMember(req.userId as string, parsed.data.workspaceId);
  if (!membership) return res.status(403).json({ error: "Not a member of this workspace" });

  const document = await prisma.document.create({
    data: {
      title: parsed.data.title ?? "Untitled document",
      workspaceId: parsed.data.workspaceId,
      ownerId: req.userId as string,
    },
  });
  res.status(201).json({ document });
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const document = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!document) return res.status(404).json({ error: "Document not found" });

  const membership = await assertMember(req.userId as string, document.workspaceId);
  if (!membership && !document.isPublic) {
    return res.status(403).json({ error: "Not authorized to view this document" });
  }

  res.json({ document });
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const document = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!document) return res.status(404).json({ error: "Document not found" });

  const membership = await assertMember(req.userId as string, document.workspaceId);
  if (!membership || membership.role === "VIEWER") {
    return res.status(403).json({ error: "Not authorized to edit this document" });
  }

  const updated = await prisma.document.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json({ document: updated });
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const document = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!document) return res.status(404).json({ error: "Document not found" });

  const membership = await assertMember(req.userId as string, document.workspaceId);
  if (!membership || membership.role !== "OWNER") {
    return res.status(403).json({ error: "Only the workspace owner can delete this document" });
  }

  await prisma.document.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
