import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";

const router = Router();

router.get("/users", requireRole("admin"), async (_req, res) => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      canViewHistory: users.canViewHistory,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.name);
  res.json({ data: rows });
});

router.post("/users", requireRole("admin"), async (req, res) => {
  const { name, email, password, role, canViewHistory } = req.body as {
    name: string;
    email: string;
    password: string;
    role: "expense_entry" | "accounts" | "admin" | "superadmin";
    canViewHistory?: boolean;
  };

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "name, email, password and role are required" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [inserted] = await db.insert(users).values({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    canViewHistory: canViewHistory ? 1 : 0,
    isActive: 1,
  }).$returningId();

  const newId = inserted.id;
  await writeAudit({
    entityType: "user",
    entityId: newId,
    action: "create",
    newValue: { name, email, role },
    userId: res.locals.user.id,
  });
  res.status(201).json({ id: newId });
});

router.put("/users/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  const { name, email, role, canViewHistory, password } = req.body as {
    name?: string;
    email?: string;
    role?: "expense_entry" | "accounts" | "admin" | "superadmin";
    canViewHistory?: boolean;
    password?: string;
  };

  const updates: Partial<typeof users.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email.toLowerCase().trim();
  if (role !== undefined) updates.role = role;
  if (canViewHistory !== undefined) updates.canViewHistory = canViewHistory ? 1 : 0;
  if (password) updates.passwordHash = await bcrypt.hash(password, 12);

  await db.update(users).set(updates).where(eq(users.id, id));
  await writeAudit({
    entityType: "user",
    entityId: id,
    action: "update",
    oldValue: existing,
    newValue: updates,
    userId: res.locals.user.id,
  });
  res.json({ success: true });
});

router.patch("/users/:id/toggle-active", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  const newActive = existing.isActive === 1 ? 0 : 1;
  await db.update(users).set({ isActive: newActive }).where(eq(users.id, id));
  await writeAudit({
    entityType: "user",
    entityId: id,
    action: newActive ? "activate" : "deactivate",
    userId: res.locals.user.id,
  });
  res.json({ isActive: newActive === 1 });
});

export default router;
