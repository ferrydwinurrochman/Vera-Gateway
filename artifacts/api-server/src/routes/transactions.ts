import { Router } from "express";
import { db, transactionsTable, merchantsTable, settingsTable, TX_STATUS } from "@workspace/db";
import { eq, desc, and, gte, lte, like, or, sql, inArray } from "drizzle-orm";
import { createDeposit, checkDepositStatus, parseCallback } from "../lib/flypay";
import { generateRef } from "../lib/auth";
import {
  GenerateTransactionBody,
  UpdateTransactionStatusBody,
  UpdateTransactionStatusParams,
  CheckTransactionStatusParams,
  ListTransactionsQueryParams,
  ListSuksesTransactionsQueryParams,
  TransactionCallbackBody,
  GetTransactionParams,
} from "@workspace/api-zod";

const router = Router();

function formatTx(tx: typeof transactionsTable.$inferSelect, merchantName?: string | null) {
  return {
    id: tx.id,
    ref: tx.ref,
    amount: tx.amount,
    status: tx.status,
    method: tx.method,
    qrCode: tx.qrCode ?? null,
    customerId: tx.customerId ?? null,
    merchantId: tx.merchantId ?? null,
    merchantName: merchantName ?? null,
    notes: tx.notes ?? null,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

async function getMerchantName(merchantId: number | null): Promise<string | null> {
  if (!merchantId) return null;
  const [m] = await db.select({ name: merchantsTable.name }).from(merchantsTable).where(eq(merchantsTable.id, merchantId)).limit(1);
  return m?.name ?? null;
}

async function getOrCreateSettings() {
  const [s] = await db.select().from(settingsTable).limit(1);
  if (s) return s;
  const [created] = await db.insert(settingsTable).values({
    flypayAppId: "4183",
    flypaySecret: "XEsiyowsnSBiDvYXFBLEPHnjhwlSIpMo",
    flypayMode: "sandbox",
    callbackBaseUrl: "",
    cooldownMinutes: 20,
  }).returning();
  return created;
}

// GET /transactions
router.get("/", async (req, res) => {
  const parsed = ListTransactionsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const session = req.session as Record<string, unknown>;
  const role = session["role"] as string | undefined;
  const sessionMerchantId = session["merchantId"] as number | null | undefined;

  const conditions = [];
  if (params.status) conditions.push(eq(transactionsTable.status, params.status));

  // Operators can only see their own merchant's transactions; ignore any
  // merchantId query param they pass and force-scope to their own.
  if (role === "operator" && sessionMerchantId != null) {
    conditions.push(eq(transactionsTable.merchantId, sessionMerchantId));
  } else if (params.merchantId) {
    conditions.push(eq(transactionsTable.merchantId, Number(params.merchantId)));
  }
  if (params.startDate) {
    const start = new Date(params.startDate);
    if (!isNaN(start.getTime())) conditions.push(gte(transactionsTable.createdAt, start));
  }
  if (params.endDate) {
    const end = new Date(params.endDate);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(transactionsTable.createdAt, end));
    }
  }
  if (params.search) {
    conditions.push(
      or(
        like(transactionsTable.ref, `%${params.search}%`),
        like(transactionsTable.customerId, `%${params.search}%`)
      )
    );
  }

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, params.limit ?? 20);
  const offset = (page - 1) * limit;

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    db.select().from(transactionsTable).where(whereClause).orderBy(desc(transactionsTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<string>`cast(count(*) as unsigned)` }).from(transactionsTable).where(whereClause),
  ]);
  const count = Number(countRows[0]?.count ?? 0);

  const merchantIds = [...new Set(rows.map((r) => r.merchantId).filter(Boolean))] as number[];
  const merchants = merchantIds.length > 0
    ? await db.select({ id: merchantsTable.id, name: merchantsTable.name }).from(merchantsTable)
        .where(inArray(merchantsTable.id, merchantIds))
    : [];

  const merchantMap = new Map(merchants.map((m) => [m.id, m.name]));

  res.json({
    data: rows.map((r) => formatTx(r, r.merchantId ? merchantMap.get(r.merchantId) ?? null : null)),
    total: count,
    page,
    limit,
  });
});

// POST /transactions/generate — Anti-double with cooldown
router.post("/generate", async (req, res) => {
  const parsed = GenerateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Data tidak valid" });
    return;
  }

  const { amount, customerId, merchantId, notes } = parsed.data;
  const settings = await getOrCreateSettings();
  const cooldownMs = (settings.cooldownMinutes ?? 20) * 60 * 1000;

  // Check for active MENUNGGU transaction within cooldown window
  const cooldownStart = new Date(Date.now() - cooldownMs);
  const [existing] = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.customerId, customerId),
        eq(transactionsTable.status, TX_STATUS.MENUNGGU),
        gte(transactionsTable.createdAt, cooldownStart)
      )
    )
    .orderBy(desc(transactionsTable.createdAt))
    .limit(1);

  if (existing) {
    const elapsed = Date.now() - existing.createdAt.getTime();
    const remainingMs = cooldownMs - elapsed;
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    res.status(409).json({
      error: `Transaksi menunggu sudah ada. Tunggu ${remainingMinutes} menit lagi sebelum generate QRIS baru.`,
      cooldownMinutes: settings.cooldownMinutes ?? 20,
      remainingMinutes,
      existingRef: existing.ref,
      existingCreatedAt: existing.createdAt.toISOString(),
    });
    return;
  }

  const ref = generateRef("TRX");
  const callbackUrl = settings.callbackBaseUrl
    ? `${settings.callbackBaseUrl}/api/transactions/callback`
    : "";

  let qrCode = "";

  // In sandbox mode, skip actual Flypay call
  if (settings.flypayMode === "live" && settings.flypaySecret) {
    try {
      const result = await createDeposit(ref, amount, customerId, callbackUrl, settings.flypayAppId, settings.flypaySecret);
      qrCode = result.qrCode;
    } catch (err) {
      res.status(500).json({ error: `Gagal membuat QRIS: ${(err as Error).message}` });
      return;
    }
  } else {
    // Sandbox: generate a dummy QR placeholder
    qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SANDBOX-${ref}-${amount}`;
  }

  const [tx] = await db.insert(transactionsTable).values({
    ref,
    amount,
    status: TX_STATUS.MENUNGGU,
    method: "QRIS",
    qrCode,
    customerId,
    merchantId: merchantId ?? null,
    notes: notes ?? null,
  }).returning();

  const merchantName = await getMerchantName(tx.merchantId ?? null);

  res.status(201).json({
    transaction: formatTx(tx, merchantName),
    qrCode,
    ref,
  });
});

// GET /transactions/sukses
router.get("/sukses", async (req, res) => {
  const parsed = ListSuksesTransactionsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const conditions = [eq(transactionsTable.status, TX_STATUS.SUKSES)];
  if (params.merchantId) conditions.push(eq(transactionsTable.merchantId, Number(params.merchantId)));
  if (params.startDate) {
    const start = new Date(params.startDate);
    if (!isNaN(start.getTime())) conditions.push(gte(transactionsTable.createdAt, start));
  }
  if (params.endDate) {
    const end = new Date(params.endDate);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(transactionsTable.createdAt, end));
    }
  }

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, params.limit ?? 20);
  const offset = (page - 1) * limit;

  const whereClause = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db.select().from(transactionsTable).where(whereClause).orderBy(desc(transactionsTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<string>`cast(count(*) as unsigned)` }).from(transactionsTable).where(whereClause),
  ]);
  const count = Number(countRows[0]?.count ?? 0);

  res.json({
    data: rows.map((r) => formatTx(r)),
    total: count,
    page,
    limit,
  });
});

// POST /transactions/callback — Flypay webhook (Status Lock enforced)
router.post("/callback", async (req, res) => {
  const body = req.body as Record<string, string>;
  const { ref, status } = parseCallback(body);

  if (!ref) {
    res.json({ success: true, message: "No ref found" });
    return;
  }

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.ref, ref)).limit(1);

  if (!tx) {
    res.json({ success: true, message: "Transaction not found" });
    return;
  }

  // STATUS LOCK: Never downgrade from SUKSES
  if (tx.status === TX_STATUS.SUKSES) {
    res.json({ success: true, message: "Transaction already SUKSES — status lock active" });
    return;
  }

  if (status === "SUKSES") {
    await db.update(transactionsTable).set({ status: TX_STATUS.SUKSES }).where(eq(transactionsTable.id, tx.id));
  } else if (status === "GAGAL" && tx.status !== TX_STATUS.SUKSES) {
    await db.update(transactionsTable).set({ status: TX_STATUS.GAGAL }).where(eq(transactionsTable.id, tx.id));
  }

  res.json({ success: true });
});

// GET /transactions/:id
router.get("/:id", async (req, res) => {
  const parsed = GetTransactionParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success || isNaN(Number(req.params.id))) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, parsed.data.id)).limit(1);
  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const merchantName = await getMerchantName(tx.merchantId ?? null);
  res.json(formatTx(tx, merchantName));
});

// PATCH /transactions/:id/status — Status Lock enforced
router.patch("/:id/status", async (req, res) => {
  const params = UpdateTransactionStatusParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateTransactionStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, params.data.id)).limit(1);
  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  // STATUS LOCK: Transaksi SUKSES tidak bisa diubah kembali
  if (tx.status === TX_STATUS.SUKSES && parsed.data.status !== TX_STATUS.SUKSES) {
    res.status(409).json({ error: "Status lock aktif: transaksi SUKSES tidak bisa diubah kembali." });
    return;
  }

  const [updated] = await db.update(transactionsTable).set({
    status: parsed.data.status,
    notes: parsed.data.notes ?? tx.notes,
  }).where(eq(transactionsTable.id, params.data.id)).returning();

  const merchantName = await getMerchantName(updated.merchantId ?? null);
  res.json(formatTx(updated, merchantName));
});

// POST /transactions/:ref/check — Manually check status via Flypay
router.post("/:ref/check", async (req, res) => {
  const { ref } = req.params;

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.ref, ref)).limit(1);
  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  // STATUS LOCK
  if (tx.status === TX_STATUS.SUKSES) {
    const merchantName = await getMerchantName(tx.merchantId ?? null);
    res.json(formatTx(tx, merchantName));
    return;
  }

  const settings = await getOrCreateSettings();

  if (settings.flypayMode === "live" && settings.flypaySecret) {
    try {
      const status = await checkDepositStatus(ref, settings.flypayAppId, settings.flypaySecret);
      if (status === "SUKSES" || status === "GAGAL") {
        const [updated] = await db.update(transactionsTable).set({ status }).where(eq(transactionsTable.id, tx.id)).returning();
        const merchantName = await getMerchantName(updated.merchantId ?? null);
        res.json(formatTx(updated, merchantName));
        return;
      }
    } catch {
      // ignore, return current
    }
  }

  const merchantName = await getMerchantName(tx.merchantId ?? null);
  res.json(formatTx(tx, merchantName));
});

export default router;
