import jwt from "jsonwebtoken";

export type Role = "expense_entry" | "accounts" | "admin" | "superadmin";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  canViewHistory: boolean;
}

const ROLE_RANK: Record<Role, number> = {
  expense_entry: 1,
  accounts: 2,
  admin: 3,
  superadmin: 4,
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required but not set");
  }
  return secret;
}

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "8h" });
}

export function requireAuth(req: any, res: any, next: () => void): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthUser;
    res.locals.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(minRole: Role) {
  return (req: any, res: any, next: () => void): void => {
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
