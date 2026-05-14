import jwt from "jsonwebtoken";
const ROLE_RANK = {
    expense_entry: 1,
    accounts: 2,
    admin: 3,
    superadmin: 4,
};
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is required but not set");
    }
    return secret;
}
export function signToken(payload) {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: "8h" });
}
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, getJwtSecret());
        res.locals.user = payload;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
export function requireRole(minRole) {
    return (req, res, next) => {
        requireAuth(req, res, () => {
            const user = res.locals.user;
            if (!user || ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
                res.status(403).json({ error: "Forbidden: insufficient role" });
                return;
            }
            next();
        });
    };
}
//# sourceMappingURL=auth.js.map