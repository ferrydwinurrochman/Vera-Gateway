import React from "react";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetDashboardRecent,
  getGetDashboardRecentQueryKey,
} from "@workspace/api-client-react";
import { formatRupiah, formatDate } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const cls = status.toLowerCase();
  return <span className={`badge ${cls}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

export function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary(
    { period: "today" },
    {
      query: {
        refetchInterval: 7000,
        queryKey: getGetDashboardSummaryQueryKey({ period: "today" }),
      },
    }
  );

  const { data: recent, isLoading: isLoadingRecent } = useGetDashboardRecent(
    { limit: 10 },
    {
      query: {
        refetchInterval: 7000,
        queryKey: getGetDashboardRecentQueryKey({ limit: 10 }),
      },
    }
  );

  const suksesCount = summary?.byStatus?.find((s) => s.status === "SUKSES")?.count || 0;
  const successRate =
    summary && summary.todayCount > 0
      ? Math.round((suksesCount / summary.todayCount) * 100)
      : 0;

  const stats = [
    {
      label: "Volume Hari Ini",
      value: summary ? formatRupiah(summary.todayAmount) : "Rp 0",
      sub: `${summary?.todayCount || 0} transaksi`,
      ic: "💰",
      icBg: "rgba(44,92,146,.12)",
    },
    {
      label: "Total Volume",
      value: summary ? formatRupiah(summary.totalAmount) : "Rp 0",
      sub: `${summary?.totalTransactions || 0} total`,
      ic: "📊",
      icBg: "rgba(44,92,146,.12)",
    },
    {
      label: "Tingkat Sukses",
      value: `${successRate}%`,
      sub: "Hari ini",
      ic: "✅",
      icBg: "rgba(30,126,76,.12)",
    },
    {
      label: "Merchant Aktif",
      value: String(summary?.topMerchants?.length || 0),
      sub: "Dengan transaksi",
      ic: "🏪",
      icBg: "rgba(44,92,146,.12)",
    },
  ];

  return (
    <>
      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%", background: "var(--green)",
          display: "inline-block", boxShadow: "0 0 0 3px var(--green-bg)"
        }} />
        <span className="muted" style={{ fontSize: 12 }}>Auto-refresh setiap 7 detik</span>
      </div>

      {/* Summary cards */}
      <div className="summary">
        {stats.map(({ label, value, sub, ic, icBg }, i) => (
          <div key={i} className="sc">
            <div className="l">
              <div className="ic" style={{ background: icBg }}>{ic}</div>
              {label}
            </div>
            {isLoadingSummary ? (
              <div style={{ height: 28, marginTop: 9, background: "var(--line)", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
            ) : (
              <>
                <div className="v mono">{value}</div>
                <div className="s">{sub}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Recent transactions + status breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        {/* Recent table */}
        <div className="tablecard">
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
            <strong style={{ fontSize: 14 }}>Transaksi Terbaru</strong>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Aktivitas terkini dari semua merchant</div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ref No</th>
                  <th>Customer / Merchant</th>
                  <th style={{ textAlign: "right" }}>Nominal</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRecent ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="empty" style={{ padding: "12px 16px" }}>
                        <div style={{ height: 14, background: "var(--line)", borderRadius: 6, animation: "pulse 1.5s ease-in-out infinite" }} />
                      </td>
                    </tr>
                  ))
                ) : recent?.data && recent.data.length > 0 ? (
                  recent.data.map((tx) => (
                    <tr key={tx.id}>
                      <td className="mono" style={{ fontSize: 12 }}>{tx.ref}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{tx.customerId || "-"}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{tx.merchantName || "-"}</div>
                      </td>
                      <td className="amt mono" style={{ textAlign: "right" }}>{formatRupiah(tx.amount)}</td>
                      <td style={{ textAlign: "center" }}>
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="muted mono" style={{ textAlign: "right", fontSize: 12 }}>
                        {new Date(tx.createdAt).toLocaleTimeString("id-ID")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty">Belum ada transaksi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="tablecard">
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
            <strong style={{ fontSize: 14 }}>Ringkasan Status</strong>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Semua waktu</div>
          </div>
          <div style={{ padding: "16px" }}>
            {isLoadingSummary ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 40, marginBottom: 12, background: "var(--line)", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
              ))
            ) : summary?.byStatus ? (
              summary.byStatus.map((s) => {
                const statusCls: Record<string, string> = {
                  SUKSES: "sukses", MENUNGGU: "menunggu", GAGAL: "gagal", KEDALUWARSA: "kedaluwarsa"
                };
                const barColors: Record<string, string> = {
                  SUKSES: "var(--green)", MENUNGGU: "var(--amber)", GAGAL: "var(--red)", KEDALUWARSA: "var(--muted)"
                };
                const pct = summary.totalTransactions > 0
                  ? Math.round((s.count / summary.totalTransactions) * 100)
                  : 0;
                return (
                  <div key={s.status} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span className={`badge ${statusCls[s.status] || "kedaluwarsa"}`}>{s.status}</span>
                      <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{s.count}</span>
                    </div>
                    <div style={{ height: 5, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: barColors[s.status] || "var(--muted)", borderRadius: 4, transition: "width .4s" }} />
                    </div>
                    <div className="muted mono" style={{ fontSize: 11, textAlign: "right", marginTop: 3 }}>{formatRupiah(s.amount)}</div>
                  </div>
                );
              })
            ) : null}
          </div>
        </div>
      </div>

      {/* Top Merchants */}
      {summary?.topMerchants && summary.topMerchants.length > 0 && (
        <div className="tablecard">
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
            <strong style={{ fontSize: 14 }}>Top Merchant Hari Ini</strong>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th style={{ textAlign: "right" }}>Transaksi</th>
                  <th style={{ textAlign: "right" }}>Volume</th>
                </tr>
              </thead>
              <tbody>
                {summary.topMerchants.map((m: any) => (
                  <tr key={m.merchantId}>
                    <td><span className="uname">{m.merchantName || `ID: ${m.merchantId}`}</span></td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{m.count}</td>
                    <td className="amt mono" style={{ textAlign: "right" }}>{formatRupiah(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
