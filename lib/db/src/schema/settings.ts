import { mysqlTable, serial, varchar, int, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = mysqlTable("settings", {
  id: serial("id").primaryKey(),
  flypayAppId: varchar("flypay_app_id", { length: 100 }).notNull().default("4183"),
  flypaySecret: varchar("flypay_secret", { length: 255 }).notNull().default(""),
  flypayMode: varchar("flypay_mode", { length: 20 }).notNull().default("sandbox"),
  callbackBaseUrl: varchar("callback_base_url", { length: 500 }).notNull().default(""),
  cooldownMinutes: int("cooldown_minutes").notNull().default(20),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
