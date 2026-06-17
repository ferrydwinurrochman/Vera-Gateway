import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  flypayAppId: text("flypay_app_id").notNull().default("4183"),
  flypaySecret: text("flypay_secret").notNull().default(""),
  flypayMode: text("flypay_mode").notNull().default("sandbox"),
  callbackBaseUrl: text("callback_base_url").notNull().default(""),
  cooldownMinutes: integer("cooldown_minutes").notNull().default(20),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
