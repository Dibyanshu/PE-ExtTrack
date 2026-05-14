import { Router } from "express";
import {
  db,
  vendorMaster,
  expenses,
  expenseVersions,
  particularsMaster,
  uomMaster,
  paymentStatusMaster,
  projectMaster,
  users,
} from "@workspace/db";
import { eq, and, gte, lte, like, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";

const router = Router();

router.get("/masters/vendors", requireAuth, async (req, res) => {
  const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (search) conditions.push(like(vendorMaster.name, `%${search}%`));

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(vendorMaster)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(vendorMaster.name)
      .limit(limitNum)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(vendorMaster)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  res.json({ data: rows, total: countResult[0]?.count ?? 0, page: pageNum, limit: limitNum });
});

router.get("/masters/vendors/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [vendor] = await db.select().from(vendorMaster).where(eq(vendorMaster.id, id)).limit(1);
  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }
  res.json({ data: vendor });
});

router.post("/masters/vendors", requireRole("admin"), async (req, res) => {
  const { name, contactPerson, phone, email, address } = req.body as {
    name: string; contactPerson?: string; phone?: string; email?: string; address?: string;
  };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [result] = await db.insert(vendorMaster).values({
    name,
    contactPerson: contactPerson ?? null,
    phone: phone ?? null,
    email: email ?? null,
    address: address ?? null,
    isActive: 1,
    createdBy: res.locals.user.id,
  });
  const newId = Number((result as any).insertId);
  await writeAudit({ entityType: "vendor", entityId: newId, action: "create", newValue: req.body, userId: res.locals.user.id });
  res.status(201).json({ id: newId });
});

router.put("/masters/vendors/:id", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(vendorMaster).where(eq(vendorMaster.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Vendor not found" }); return; }

  const { name, contactPerson, phone, email, address } = req.body as {
    name?: string; contactPerson?: string; phone?: string; email?: string; address?: string;
  };

  await db.update(vendorMaster).set({
    ...(name !== undefined && { name }),
    ...(contactPerson !== undefined && { contactPerson }),
    ...(phone !== undefined && { phone }),
    ...(email !== undefined && { email }),
    ...(address !== undefined && { address }),
  }).where(eq(vendorMaster.id, id));

  await writeAudit({ entityType: "vendor", entityId: id, action: "update", oldValue: existing, newValue: req.body, userId: res.locals.user.id });
  res.json({ success: true });
});

router.patch("/masters/vendors/:id/toggle-active", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(vendorMaster).where(eq(vendorMaster.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Vendor not found" }); return; }
  const newActive = existing.isActive === 1 ? 0 : 1;
  await db.update(vendorMaster).set({ isActive: newActive }).where(eq(vendorMaster.id, id));
  await writeAudit({ entityType: "vendor", entityId: id, action: newActive ? "activate" : "deactivate", userId: res.locals.user.id });
  res.json({ isActive: newActive === 1 });
});

router.get("/masters/vendors/:id/vouchers", requireRole("accounts"), async (req, res) => {
  const vendorId = Number(req.params.id);
  const { from, to, type, paymentStatus, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));
  const offset = (pageNum - 1) * limitNum;

  const [vendor] = await db.select().from(vendorMaster).where(eq(vendorMaster.id, vendorId)).limit(1);
  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }

  const conditions: ReturnType<typeof eq>[] = [eq(expenses.vendorId, vendorId)];
  if (type === "payment" || type === "receive") conditions.push(eq(expenses.voucherType, type));

  const rows = await db
    .select({
      expenseId: expenses.id,
      voucherType: expenses.voucherType,
      projectName: projectMaster.name,
      vendorName: vendorMaster.name,
      voucherNumber: expenseVersions.voucherNumber,
      expenseDate: expenseVersions.expenseDate,
      particularName: particularsMaster.name,
      uomName: uomMaster.name,
      quantity: expenseVersions.quantity,
      pricePerUnit: expenseVersions.pricePerUnit,
      amount: expenseVersions.amount,
      invoiceNumber: expenseVersions.invoiceNumber,
      paymentStatusName: paymentStatusMaster.name,
      paymentStatusId: expenseVersions.paymentStatusId,
      versionId: expenseVersions.id,
      versionNo: expenseVersions.versionNo,
    })
    .from(expenses)
    .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId!))
    .innerJoin(projectMaster, eq(projectMaster.id, expenses.projectId))
    .innerJoin(vendorMaster, eq(vendorMaster.id, expenses.vendorId))
    .innerJoin(particularsMaster, eq(particularsMaster.id, expenseVersions.particularId))
    .innerJoin(uomMaster, eq(uomMaster.id, expenseVersions.uomId))
    .innerJoin(paymentStatusMaster, eq(paymentStatusMaster.id, expenseVersions.paymentStatusId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(expenseVersions.expenseDate)
    .limit(limitNum)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(expenses)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({ vendor, data: rows, total: countResult?.count ?? 0, page: pageNum, limit: limitNum });
});

export default router;
