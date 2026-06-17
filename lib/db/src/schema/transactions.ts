import { mysqlTable, serial, varchar, int, text, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const TX_STATUS = {
  MENUNGGU: "MENUNGGU",
  SUKSES: "SUKSES",
  GAGAL: "GAGAL",
  KEDALUWARSA: "KEDALUWARSA",
} as const;

export type TxStatus = (typeof TX_STATUS)[keyof typeof TX_STATUS];

export const transactionsTable = mysqlTable("transactions", {
  id: serial("id").primaryKey(),
  ref: varchar("ref", { length: 100 }).notNull().unique(),
  amount: int("amount").notNull(),
  status: varchar("status", { length: 20 }).notNull().default(TX_STATUS.MENUNGGU),
  method: varchar("method", { length: 20 }).notNull().default("QRIS"),
  qrCode: text("qr_code"),
  customerId: varchar("customer_id", { length: 255 }),
  merchantId: int("merchant_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
