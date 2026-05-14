import { Router } from "express";
import { db, vendorMaster, expenses, expenseVersions, particularsMaster, uomMaster, paymentStatusMaster, projectMaster, } from "@workspace/db";
import { eq, and, gte, lte, like, sql, isNull } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";
const router = Router();
router.get("/masters/vendors", requireAuth, async (req, res) => {
    const { search, page = "1", limit = "50", } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));
    const offset = (pageNum - 1) * limitNum;
    const conditions = [];
    if (search)
        conditions.push(like(vendorMaster.name, `%${search}%`));
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, countResult] = await Promise.all([
        db
            .select()
            .from(vendorMaster)
            .where(where)
            .orderBy(vendorMaster.name)
            .limit(limitNum)
            .offset(offset),
        db
            .select({ count: sql `count(*)` })
            .from(vendorMaster)
            .where(where),
    ]);
    res.json({ data: rows, total: countResult[0]?.count ?? 0, page: pageNum, limit: limitNum });
});
router.get("/masters/vendors/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const [vendor] = await db
        .select()
        .from(vendorMaster)
        .where(eq(vendorMaster.id, id))
        .limit(1);
    if (!vendor) {
        res.status(404).json({ error: "Vendor not found" });
        return;
    }
    res.json({ data: vendor });
});
router.post("/masters/vendors", requireRole("admin"), async (req, res) => {
    const { name, contactPerson, phone, email, address } = req.body;
    if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
    }
    const [inserted] = await db.insert(vendorMaster).values({
        name,
        contactPerson: contactPerson ?? null,
        phone: phone ?? null,
        email: email ?? null,
        address: address ?? null,
        isActive: 1,
        createdBy: res.locals.user.id,
    }).$returningId();
    await writeAudit({
        entityType: "vendor",
        entityId: inserted.id,
        action: "create",
        newValue: req.body,
        userId: res.locals.user.id,
    });
    res.status(201).json({ id: inserted.id });
});
router.put("/masters/vendors/:id", requireRole("admin"), async (req, res) => {
    const id = Number(req.params.id);
    const [existing] = await db
        .select()
        .from(vendorMaster)
        .where(eq(vendorMaster.id, id))
        .limit(1);
    if (!existing) {
        res.status(404).json({ error: "Vendor not found" });
        return;
    }
    const { name, contactPerson, phone, email, address } = req.body;
    await db
        .update(vendorMaster)
        .set({
        ...(name !== undefined && { name }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
    })
        .where(eq(vendorMaster.id, id));
    await writeAudit({
        entityType: "vendor",
        entityId: id,
        action: "update",
        oldValue: existing,
        newValue: req.body,
        userId: res.locals.user.id,
    });
    res.json({ success: true });
});
router.patch("/masters/vendors/:id/toggle-active", requireRole("admin"), async (req, res) => {
    const id = Number(req.params.id);
    const [existing] = await db
        .select()
        .from(vendorMaster)
        .where(eq(vendorMaster.id, id))
        .limit(1);
    if (!existing) {
        res.status(404).json({ error: "Vendor not found" });
        return;
    }
    const newActive = existing.isActive === 1 ? 0 : 1;
    await db
        .update(vendorMaster)
        .set({ isActive: newActive })
        .where(eq(vendorMaster.id, id));
    await writeAudit({
        entityType: "vendor",
        entityId: id,
        action: newActive ? "activate" : "deactivate",
        userId: res.locals.user.id,
    });
    res.json({ isActive: newActive === 1 });
});
router.get("/masters/vendors/:id/vouchers", requireRole("accounts"), async (req, res) => {
    const vendorId = Number(req.params.id);
    const { from, to, type, paymentStatus, page = "1", limit = "20", } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));
    const offset = (pageNum - 1) * limitNum;
    const [vendor] = await db
        .select()
        .from(vendorMaster)
        .where(eq(vendorMaster.id, vendorId))
        .limit(1);
    if (!vendor) {
        res.status(404).json({ error: "Vendor not found" });
        return;
    }
    const conditions = [
        eq(expenses.vendorId, vendorId),
        isNull(expenses.deletedAt),
    ];
    if (type === "payment" || type === "receive") {
        conditions.push(eq(expenses.voucherType, type));
    }
    // expenseDate is mode:"string" — compare with ISO date strings, not Date objects
    if (from)
        conditions.push(gte(expenseVersions.expenseDate, from));
    if (to)
        conditions.push(lte(expenseVersions.expenseDate, to));
    if (paymentStatus) {
        conditions.push(eq(expenseVersions.paymentStatusId, Number(paymentStatus)));
    }
    const where = and(...conditions);
    const [rows, countResult] = await Promise.all([
        db
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
            approvedAt: expenses.approvedAt,
        })
            .from(expenses)
            .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId))
            .innerJoin(projectMaster, eq(projectMaster.id, expenses.projectId))
            .innerJoin(vendorMaster, eq(vendorMaster.id, expenses.vendorId))
            .innerJoin(particularsMaster, eq(particularsMaster.id, expenseVersions.particularId))
            .innerJoin(uomMaster, eq(uomMaster.id, expenseVersions.uomId))
            .innerJoin(paymentStatusMaster, eq(paymentStatusMaster.id, expenseVersions.paymentStatusId))
            .where(where)
            .orderBy(expenseVersions.expenseDate)
            .limit(limitNum)
            .offset(offset),
        db
            .select({ count: sql `count(*)` })
            .from(expenses)
            .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId))
            .where(where),
    ]);
    res.json({
        vendor,
        data: rows,
        total: countResult[0]?.count ?? 0,
        page: pageNum,
        limit: limitNum,
    });
});
export default router;
//# sourceMappingURL=vendors.js.map