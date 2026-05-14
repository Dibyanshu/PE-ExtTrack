import { Router } from "express";
import {
  db,
  particularsMaster,
  uomMaster,
  paymentStatusMaster,
  projectMaster,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";

const router = Router();

// ─── Particulars ──────────────────────────────────────────────────────────────

router.get("/masters/particulars", requireAuth, async (_req, res) => {
  const rows = await db.select().from(particularsMaster).orderBy(particularsMaster.name);
  res.json({ data: rows });
});

router.post("/masters/particulars", requireRole("admin"), async (req, res) => {
  const { name } = req.body as { name: string };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const userId = res.locals.user.id;
  const [ins] = await db.insert(particularsMaster).values({ name, createdBy: userId }).$returningId();
  await writeAudit({ entityType: "particular", entityId: ins.id, action: "create", newValue: { name }, userId });
  res.status(201).json({ id: ins.id });
});

router.put("/masters/particulars/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(particularsMaster).where(eq(particularsMaster.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const { name } = req.body as { name: string };
  await db.update(particularsMaster).set({ name }).where(eq(particularsMaster.id, id));
  await writeAudit({ entityType: "particular", entityId: id, action: "update", oldValue: existing, newValue: { name }, userId: res.locals.user.id });
  res.json({ success: true });
});

router.delete("/masters/particulars/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(particularsMaster).where(eq(particularsMaster.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(particularsMaster).where(eq(particularsMaster.id, id));
  await writeAudit({ entityType: "particular", entityId: id, action: "delete", oldValue: existing, userId: res.locals.user.id });
  res.json({ success: true });
});

// ─── UOM ──────────────────────────────────────────────────────────────────────

router.get("/masters/uom", requireAuth, async (_req, res) => {
  const rows = await db.select().from(uomMaster).orderBy(uomMaster.name);
  res.json({ data: rows });
});

router.post("/masters/uom", requireRole("admin"), async (req, res) => {
  const { name } = req.body as { name: string };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const userId = res.locals.user.id;
  const [ins] = await db.insert(uomMaster).values({ name, createdBy: userId }).$returningId();
  await writeAudit({ entityType: "uom", entityId: ins.id, action: "create", newValue: { name }, userId });
  res.status(201).json({ id: ins.id });
});

router.put("/masters/uom/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(uomMaster).where(eq(uomMaster.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const { name } = req.body as { name: string };
  await db.update(uomMaster).set({ name }).where(eq(uomMaster.id, id));
  await writeAudit({ entityType: "uom", entityId: id, action: "update", oldValue: existing, newValue: { name }, userId: res.locals.user.id });
  res.json({ success: true });
});

router.delete("/masters/uom/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(uomMaster).where(eq(uomMaster.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(uomMaster).where(eq(uomMaster.id, id));
  await writeAudit({ entityType: "uom", entityId: id, action: "delete", oldValue: existing, userId: res.locals.user.id });
  res.json({ success: true });
});

// ─── Payment Status ───────────────────────────────────────────────────────────

router.get("/masters/payment-status", requireAuth, async (_req, res) => {
  const rows = await db.select().from(paymentStatusMaster).orderBy(paymentStatusMaster.name);
  res.json({ data: rows });
});

router.post("/masters/payment-status", requireRole("admin"), async (req, res) => {
  const { name } = req.body as { name: string };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const userId = res.locals.user.id;
  const [ins] = await db.insert(paymentStatusMaster).values({ name, createdBy: userId }).$returningId();
  await writeAudit({ entityType: "payment_status", entityId: ins.id, action: "create", newValue: { name }, userId });
  res.status(201).json({ id: ins.id });
});

router.put("/masters/payment-status/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(paymentStatusMaster).where(eq(paymentStatusMaster.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const { name } = req.body as { name: string };
  await db.update(paymentStatusMaster).set({ name }).where(eq(paymentStatusMaster.id, id));
  await writeAudit({ entityType: "payment_status", entityId: id, action: "update", oldValue: existing, newValue: { name }, userId: res.locals.user.id });
  res.json({ success: true });
});

router.delete("/masters/payment-status/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(paymentStatusMaster).where(eq(paymentStatusMaster.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(paymentStatusMaster).where(eq(paymentStatusMaster.id, id));
  await writeAudit({ entityType: "payment_status", entityId: id, action: "delete", oldValue: existing, userId: res.locals.user.id });
  res.json({ success: true });
});

// ─── Projects ─────────────────────────────────────────────────────────────────

router.get("/masters/projects", requireAuth, async (_req, res) => {
  const rows = await db.select().from(projectMaster).orderBy(projectMaster.name);
  res.json({ data: rows });
});

router.post("/masters/projects", requireRole("admin"), async (req, res) => {
  const { code, name } = req.body as { code: string; name: string };
  if (!code || !name) { res.status(400).json({ error: "code and name are required" }); return; }
  const userId = res.locals.user.id;
  const [ins] = await db.insert(projectMaster).values({ code, name, createdBy: userId }).$returningId();
  await writeAudit({ entityType: "project", entityId: ins.id, action: "create", newValue: { code, name }, userId });
  res.status(201).json({ id: ins.id });
});

router.put("/masters/projects/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(projectMaster).where(eq(projectMaster.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const { code, name } = req.body as { code?: string; name?: string };
  const updates: Partial<typeof projectMaster.$inferInsert> = {};
  if (code !== undefined) updates.code = code;
  if (name !== undefined) updates.name = name;
  await db.update(projectMaster).set(updates).where(eq(projectMaster.id, id));
  await writeAudit({ entityType: "project", entityId: id, action: "update", oldValue: existing, newValue: updates, userId: res.locals.user.id });
  res.json({ success: true });
});

router.delete("/masters/projects/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(projectMaster).where(eq(projectMaster.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(projectMaster).where(eq(projectMaster.id, id));
  await writeAudit({ entityType: "project", entityId: id, action: "delete", oldValue: existing, userId: res.locals.user.id });
  res.json({ success: true });
});

export default router;
