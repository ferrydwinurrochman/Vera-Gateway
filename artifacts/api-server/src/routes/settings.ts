import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router = Router();

async function getOrCreateSettings() {
  const [existing] = await db.select().from(settingsTable).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(settingsTable).values({
    flypayAppId: "4183",
    flypaySecret: "",
    flypayMode: "sandbox",
    callbackBaseUrl: "",
    cooldownMinutes: 20,
  }).returning();
  return created;
}

router.get("/", async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      id: settings.id,
      flypayAppId: settings.flypayAppId,
      flypayMode: settings.flypayMode,
      callbackBaseUrl: settings.callbackBaseUrl,
      cooldownMinutes: settings.cooldownMinutes,
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[settings] GET /", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/", async (req, res) => {
  try {
    const parsed = UpdateSettingsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const settings = await getOrCreateSettings();
    const updates: Partial<typeof settingsTable.$inferInsert> = {};
    if (parsed.data.flypayAppId !== undefined) updates.flypayAppId = parsed.data.flypayAppId;
    if (parsed.data.flypaySecret !== undefined) updates.flypaySecret = parsed.data.flypaySecret ?? "";
    if (parsed.data.flypayMode !== undefined) updates.flypayMode = parsed.data.flypayMode;
    if (parsed.data.callbackBaseUrl !== undefined) updates.callbackBaseUrl = parsed.data.callbackBaseUrl;
    if (parsed.data.cooldownMinutes !== undefined) updates.cooldownMinutes = parsed.data.cooldownMinutes;

    const [updated] = await db.update(settingsTable).set(updates).where(
      eq(settingsTable.id, settings.id)
    ).returning();

    const final = updated ?? settings;
    res.json({
      id: final.id,
      flypayAppId: final.flypayAppId,
      flypayMode: final.flypayMode,
      callbackBaseUrl: final.callbackBaseUrl,
      cooldownMinutes: final.cooldownMinutes,
      updatedAt: final.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[settings] PATCH /", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
