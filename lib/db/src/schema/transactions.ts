import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const TX_STATUS = {
  MENUNGGU: "MENUNGGU",
  SUKSES: "SUKSES",
  GAGAL: "GAGAL",
  KEDALUWARSA: "KEDALUWARSA",
} as const;

export type TxStatus = (typeof TX_STATUS)[keyof typeof TX_STATUS];

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  ref: text("ref").notNull().unique(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default(TX_STATUS.MENUNGGU),
  method: text("method").notNull().default("QRIS"),
  qrCode: text("qr_code"),
  customerId: text("customer_id"),
  merchantId: integer("merchant_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
