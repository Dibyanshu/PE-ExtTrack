import { db } from "@workspace/db";
import { auditLogs } from "@workspace/db";
export async function writeAudit(params) {
    try {
        await db.insert(auditLogs).values({
            entityType: params.entityType,
            entityId: params.entityId,
            action: params.action,
            oldValue: params.oldValue ?? null,
            newValue: params.newValue ?? null,
            userId: params.userId ?? null,
        });
    }
    catch (err) {
        console.error("Audit log write failed:", err);
    }
}
//# sourceMappingURL=audit.js.map