import { Router } from "express";
import { db, merchantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateMerchantBody, UpdateMerchantBody, UpdateMerchantParams, DeleteMerchantParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const merchants = await db.select().from(merchantsTable).orderBy(merchantsTable.createdAt);
  res.json(merchants.map((m) => ({
    ...m,
    callbackUrl: m.callbackUrl ?? null,
    createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const parsed = CreateMerchantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [merchant] = await db.insert(merchantsTable).values({
    name: parsed.data.name,
    code: parsed.data.code,
    callbackUrl: parsed.data.callbackUrl ?? null,
    isActive: parsed.data.isActive ?? true,
  }).returning();

  res.status(201).json({
    ...merchant,
    callbackUrl: merchant.callbackUrl ?? null,
    createdAt: merchant.createdAt.toISOString(),
  });
});

router.patch("/:id", async (req, res) => {
  const params = UpdateMerchantParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateMerchantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const updates: Partial<typeof merchantsTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.code !== undefined) updates.code = parsed.data.code;
  if (parsed.data.callbackUrl !== undefined) updates.callbackUrl = parsed.data.callbackUrl ?? null;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  const [merchant] = await db.update(merchantsTable).set(updates).where(eq(merchantsTable.id, params.data.id)).returning();

  if (!merchant) {
    res.status(404).json({ error: "Merchant not found" });
    return;
  }

  res.json({
    ...merchant,
    callbackUrl: merchant.callbackUrl ?? null,
    createdAt: merchant.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const params = DeleteMerchantParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(merchantsTable).where(eq(merchantsTable.id, params.data.id));
  res.json({ success: true, message: "Merchant deleted" });
});

export default router;
