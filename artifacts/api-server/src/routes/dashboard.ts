import { Router } from "express";
import { db, transactionsTable, merchantsTable } from "@workspace/db";
import { eq, sql, gte, and, desc, inArray } from "drizzle-orm";
import { GetDashboardSummaryQueryParams, GetDashboardRecentQueryParams } from "@workspace/api-zod";

const router = Router();

function getPeriodStart(period: string): Date | null {
  const now = new Date();
  const jakartaOffset = 7 * 60 * 60 * 1000;
  const jakartaTime = new Date(now.getTime() + jakartaOffset - now.getTimezoneOffset() * 60000);

  if (period === "today") {
    const start = new Date(jakartaTime);
    start.setHours(0, 0, 0, 0);
    return new Date(start.getTime() - jakartaOffset + now.getTimezoneOffset() * 60000);
  } else if (period === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  } else if (period === "month") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return start;
  }
  return null;
}

router.get("/summary", async (req, res) => {
  const parsed = GetDashboardSummaryQueryParams.safeParse(req.query);
  const period = parsed.success ? (parsed.data.period ?? "today") : "today";

  const session = req.session as Record<string, unknown>;
  const role = session["role"] as string | undefined;
  const sessionMerchantId = session["merchantId"] as number | null | undefined;

  const merchantFilter =
    role === "operator" && sessionMerchantId != null
      ? eq(transactionsTable.merchantId, sessionMerchantId)
      : undefined;

  const periodStart = getPeriodStart(period);

  const totalRows = await db.select({
    status: transactionsTable.status,
    count: sql<string>`cast(count(*) as unsigned)`,
    amount: sql<string>`cast(coalesce(sum(${transactionsTable.amount}), 0) as unsigned)`,
  }).from(transactionsTable).where(merchantFilter).groupBy(transactionsTable.status);

  const totalTransactions = totalRows.reduce((s, r) => s + Number(r.count), 0);
  const totalAmount = totalRows.reduce((s, r) => s + Number(r.amount), 0);

  const todayStart = getPeriodStart("today")!;
  const todayCondition = merchantFilter
    ? and(gte(transactionsTable.createdAt, todayStart), merchantFilter)
    : gte(transactionsTable.createdAt, todayStart);
  const [todayRow] = await db.select({
    count: sql<string>`cast(count(*) as unsigned)`,
    amount: sql<string>`cast(coalesce(sum(${transactionsTable.amount}), 0) as unsigned)`,
  }).from(transactionsTable).where(todayCondition);

  const periodCondition = periodStart
    ? merchantFilter
      ? and(gte(transactionsTable.createdAt, periodStart), merchantFilter)
      : gte(transactionsTable.createdAt, periodStart)
    : undefined;
  const periodRows = periodCondition
    ? await db.select({
        status: transactionsTable.status,
        count: sql<string>`cast(count(*) as unsigned)`,
        amount: sql<string>`cast(coalesce(sum(${transactionsTable.amount}), 0) as unsigned)`,
      }).from(transactionsTable).where(periodCondition).groupBy(transactionsTable.status)
    : totalRows;

  const byStatus = [
    { status: "MENUNGGU", count: 0, amount: 0 },
    { status: "SUKSES", count: 0, amount: 0 },
    { status: "GAGAL", count: 0, amount: 0 },
    { status: "KEDALUWARSA", count: 0, amount: 0 },
  ].map((def) => {
    const row = periodRows.find((r) => r.status === def.status);
    return {
      status: def.status,
      count: row ? Number(row.count) : 0,
      amount: row ? Number(row.amount) : 0,
    };
  });

  const topMerchantsWhere = merchantFilter
    ? and(eq(transactionsTable.status, "SUKSES"), merchantFilter)
    : eq(transactionsTable.status, "SUKSES");

  const topMerchantsRaw = await db
    .select({
      merchantId: transactionsTable.merchantId,
      count: sql<string>`cast(count(*) as unsigned)`,
      amount: sql<string>`cast(coalesce(sum(${transactionsTable.amount}), 0) as unsigned)`,
    })
    .from(transactionsTable)
    .where(topMerchantsWhere)
    .groupBy(transactionsTable.merchantId)
    .orderBy(desc(sql`sum(${transactionsTable.amount})`))
    .limit(5);

  const merchantIds = topMerchantsRaw
    .map((r) => r.merchantId)
    .filter((id): id is number => id !== null);

  const merchants = merchantIds.length > 0
    ? await db.select({ id: merchantsTable.id, name: merchantsTable.name })
        .from(merchantsTable)
        .where(inArray(merchantsTable.id, merchantIds))
    : [];

  const merchantMap = new Map(merchants.map((m) => [m.id, m.name]));

  const topMerchants = topMerchantsRaw
    .filter((r) => r.merchantId !== null)
    .map((r) => ({
      merchantId: r.merchantId!,
      merchantName: merchantMap.get(r.merchantId!) ?? "Unknown",
      count: Number(r.count),
      amount: Number(r.amount),
    }));

  res.json({
    totalTransactions,
    totalAmount,
    todayCount: todayRow ? Number(todayRow.count) : 0,
    todayAmount: todayRow ? Number(todayRow.amount) : 0,
    byStatus,
    topMerchants,
  });
});

router.get("/recent", async (req, res) => {
  const parsed = GetDashboardRecentQueryParams.safeParse(req.query);
  const limit = Math.min(50, parsed.success ? (parsed.data.limit ?? 10) : 10);

  const session = req.session as Record<string, unknown>;
  const role = session["role"] as string | undefined;
  const sessionMerchantId = session["merchantId"] as number | null | undefined;

  const merchantFilter =
    role === "operator" && sessionMerchantId != null
      ? eq(transactionsTable.merchantId, sessionMerchantId)
      : undefined;

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(merchantFilter)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);

  res.json(rows.map((r) => ({
    id: r.id,
    ref: r.ref,
    amount: r.amount,
    status: r.status,
    method: r.method,
    qrCode: r.qrCode ?? null,
    customerId: r.customerId ?? null,
    merchantId: r.merchantId ?? null,
    merchantName: null,
    notes: r.notes ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});

export default router;
