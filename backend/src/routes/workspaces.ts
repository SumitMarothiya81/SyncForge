import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({ name: z.string().min(1) });

// List workspaces the current user belongs to
router.get("/", async (req: AuthedRequest, res) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: req.userId },
    include: { workspace: true },
  });
  res.json({ workspaces: memberships.map((m) => ({ ...m.workspace, role: m.role })) });
});

router.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      members: { create: { userId: req.userId as string, role: "OWNER" } },
    },
  });

  res.status(201).json({ workspace });
});

export default router;
