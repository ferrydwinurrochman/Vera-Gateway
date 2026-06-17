import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/auth";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { username, password } = parsed.data;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Username atau password salah" });
      return;
    }

    (req.session as Record<string, unknown>)["userId"] = user.id;
    (req.session as Record<string, unknown>)["role"] = user.role;
    (req.session as Record<string, unknown>)["merchantId"] = user.merchantId ?? null;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        merchantId: user.merchantId ?? null,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[auth] POST /login", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (req, res) => {
  try {
    req.session.destroy(() => {
      res.json({ success: true, message: "Logged out" });
    });
  } catch (error) {
    console.error("[auth] POST /logout", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const userId = (req.session as Record<string, unknown>)["userId"] as number | undefined;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      merchantId: user.merchantId ?? null,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[auth] GET /me", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
