import { Router } from "express";
import { db, particularsMaster, uomMaster, paymentStatusMaster, projectMaster } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";

const router = Router();

function masterCrud<T extends { id: number }>(
  table: any,
  entityType: string,
  insertFields: (body: any, userId: number) => any,
) {
  const r = Router();

  r.get("/", requireAuth, async (req, res) => {
    const rows = await db.select().from(table).orderBy(table.name);
    res.json({ data: rows });
  });

  r.post("/", requireRole("admin"), async (req, res) => {
    const userId = res.locals.user.id;
    const values = insertFields(req.body, userId);
    if (!values.name) { res.status(400).json({ error: "name is required" }); return; }
    const [result] = await db.insert(table).values(values);
    const newId = Number((result as any).insertId);
    await writeAudit({ entityType, entityId: newId, action: "create", newValue: values, userId });
    res.status(201).json({ id: newId });
  });

  r.put("/:id", requireRole("admin"), async (req, res) => {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await db.update(table).set({ name: req.body.name }).where(eq(table.id, id));
    await writeAudit({ entityType, entityId: id, action: "update", oldValue: existing, newValue: req.body, userId: res.locals.user.id });
    res.json({ success: true });
  });

  r.delete("/:id", requireRole("admin"), async (req, res) => {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(table).where(eq(table.id, id));
    await writeAudit({ entityType, entityId: id, action: "delete", oldValue: existing, userId: res.locals.user.id });
    res.json({ success: true });
  });

  return r;
}

router.use(
  "/masters/particulars",
  masterCrud(particularsMaster, "particular", (body: any, userId: number) => ({ name: body.name, createdBy: userId })),
);

router.use(
  "/masters/uom",
  masterCrud(uomMaster, "uom", (body: any, userId: number) => ({ name: body.name, createdBy: userId })),
);

router.use(
  "/masters/payment-status",
  masterCrud(paymentStatusMaster, "payment_status", (body: any, userId: number) => ({ name: body.name, createdBy: userId })),
);

router.use(
  "/masters/projects",
  masterCrud(projectMaster, "project", (body: any, userId: number) => ({
    code: body.code,
    name: body.name,
    createdBy: userId,
  })),
);

export default router;
