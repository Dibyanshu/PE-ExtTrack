import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth, type AuthUser } from "../middlewares/auth";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const payload: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as AuthUser["role"],
    canViewHistory: user.canViewHistory === 1,
  };

  const token = signToken(payload);
  res.json({ token, user: payload });
});

router.post("/auth/refresh", requireAuth, (req, res) => {
  const user = res.locals.user;
  const token = signToken(user);
  res.json({ token, user });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: res.locals.user });
});

export default router;
