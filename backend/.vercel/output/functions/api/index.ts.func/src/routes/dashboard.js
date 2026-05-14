import { Router } from "express";
import { db, expenses, expenseVersions, projectMaster, paymentStatusMaster, vendorMaster, } from "@workspace/db";
import { eq, and, gte, lte, sql, desc, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
const router = Router();
router.get("/dashboard/summary", requireAuth, async (req, res) => {
    const { from, to } = req.query;
    // expenseDate is mode:"string" — compare with ISO date strings, not Date objects
    const dateConditions = [isNull(expenses.deletedAt)];
    if (from)
        dateConditions.push(gte(expenseVersions.expenseDate, from));
    if (to)
        dateConditions.push(lte(expenseVersions.expenseDate, to));
    const baseWhere = and(...dateConditions);
    const joinBase = db
        .select({
        projectId: expenses.projectId,
        projectName: projectMaster.name,
        paymentStatusId: expenseVersions.paymentStatusId,
        paymentStatusName: paymentStatusMaster.name,
        voucherType: expenses.voucherType,
        amount: expenseVersions.amount,
    })
        .from(expenses)
        .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId))
        .innerJoin(projectMaster, eq(projectMaster.id, expenses.projectId))
        .innerJoin(paymentStatusMaster, eq(paymentStatusMaster.id, expenseVersions.paymentStatusId))
        .where(baseWhere);
    const [byProject, byStatus, byType, totals, recentVouchers] = await Promise.all([
        db
            .select({
            projectId: expenses.projectId,
            projectName: projectMaster.name,
            totalAmount: sql `CAST(SUM(${expenseVersions.amount}) AS CHAR)`,
            count: sql `COUNT(*)`,
        })
            .from(expenses)
            .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId))
            .innerJoin(projectMaster, eq(projectMaster.id, expenses.projectId))
            .where(baseWhere)
            .groupBy(expenses.projectId, projectMaster.name),
        db
            .select({
            paymentStatusId: expenseVersions.paymentStatusId,
            paymentStatusName: paymentStatusMaster.name,
            totalAmount: sql `CAST(SUM(${expenseVersions.amount}) AS CHAR)`,
            count: sql `COUNT(*)`,
        })
            .from(expenses)
            .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId))
            .innerJoin(paymentStatusMaster, eq(paymentStatusMaster.id, expenseVersions.paymentStatusId))
            .where(baseWhere)
            .groupBy(expenseVersions.paymentStatusId, paymentStatusMaster.name),
        db
            .select({
            voucherType: expenses.voucherType,
            totalAmount: sql `CAST(SUM(${expenseVersions.amount}) AS CHAR)`,
            count: sql `COUNT(*)`,
        })
            .from(expenses)
            .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId))
            .where(baseWhere)
            .groupBy(expenses.voucherType),
        db
            .select({
            totalAmount: sql `CAST(SUM(${expenseVersions.amount}) AS CHAR)`,
            totalCount: sql `COUNT(*)`,
        })
            .from(expenses)
            .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId))
            .where(baseWhere),
        db
            .select({
            expenseId: expenses.id,
            voucherType: expenses.voucherType,
            voucherNumber: expenseVersions.voucherNumber,
            expenseDate: expenseVersions.expenseDate,
            projectName: projectMaster.name,
            vendorName: vendorMaster.name,
            amount: expenseVersions.amount,
            paymentStatusName: paymentStatusMaster.name,
        })
            .from(expenses)
            .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId))
            .innerJoin(projectMaster, eq(projectMaster.id, expenses.projectId))
            .innerJoin(vendorMaster, eq(vendorMaster.id, expenses.vendorId))
            .innerJoin(paymentStatusMaster, eq(paymentStatusMaster.id, expenseVersions.paymentStatusId))
            .where(baseWhere)
            .orderBy(desc(expenseVersions.expenseDate))
            .limit(10),
    ]);
    res.json({
        totalAmount: totals[0]?.totalAmount ?? "0",
        totalCount: totals[0]?.totalCount ?? 0,
        byProject,
        byStatus,
        byType,
        recentVouchers,
    });
});
export default router;
//# sourceMappingURL=dashboard.js.map