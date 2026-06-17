import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth";
import { CreateUserBody, UpdateUserBody, UpdateUserParams, DeleteUserParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      role: usersTable.role,
      merchantId: usersTable.merchantId,
      createdAt: usersTable.createdAt,
    }).from(usersTable).orderBy(usersTable.createdAt);

    res.json(users.map((u) => ({
      ...u,
      merchantId: u.merchantId ?? null,
      createdAt: u.createdAt.toISOString(),
    })));
  } catch (error) {
    console.error("[users] GET /", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { username, password, role, merchantId } = parsed.data;
    const passwordHash = hashPassword(password);

    const [user] = await db.insert(usersTable).values({
      username,
      passwordHash,
      role,
      merchantId: merchantId ?? null,
    }).returning();

    res.status(201).json({
      id: user.id,
      username: user.username,
      role: user.role,
      merchantId: user.merchantId ?? null,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[users] POST /", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const params = UpdateUserParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const updates: Partial<typeof usersTable.$inferInsert> = {};
    if (parsed.data.username) updates.username = parsed.data.username;
    if (parsed.data.role) updates.role = parsed.data.role;
    if (parsed.data.merchantId !== undefined) updates.merchantId = parsed.data.merchantId ?? null;
    if (parsed.data.password) updates.passwordHash = hashPassword(parsed.data.password);

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, params.data.id)).returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
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
    console.error("[users] PATCH /:id", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const params = DeleteUserParams.safeParse({ id: Number(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("[users] DELETE /:id", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
