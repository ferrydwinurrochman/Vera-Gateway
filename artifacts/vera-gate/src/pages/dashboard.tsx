import React from "react";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetDashboardRecent,
  getGetDashboardRecentQueryKey,
} from "@workspace/api-client-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Wallet, Activity, CheckCircle2, Store, Clock, XCircle, AlertCircle } from "lucide-react";

function formatStatus(status: string) {
  switch (status) {
    case "SUKSES": return <span className="status-sukses">Sukses</span>;
    case "MENUNGGU": return <span className="status-menunggu">Menunggu</span>;
    case "GAGAL": return <span className="status-gagal">Gagal</span>;
    case "KEDALUWARSA": return <span className="status-kedaluwarsa">Kedaluwarsa</span>;
    default: return <span className="status-kedaluwarsa">{status}</span>;
  }
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
      sub: `${summary?.todayCount || 0} transaksi hari ini`,
      icon: Wallet,
    },
    {
      label: "Total Volume",
      value: summary ? formatRupiah(summary.totalAmount) : "Rp 0",
      sub: `${summary?.totalTransactions || 0} total transaksi`,
      icon: Activity,
    },
    {
      label: "Tingkat Sukses",
      value: `${successRate}%`,
      sub: "Berdasarkan data hari ini",
      icon: CheckCircle2,
    },
    {
      label: "Merchant Aktif",
      value: summary?.topMerchants?.length || 0,
      sub: "Dengan transaksi hari ini",
      icon: Store,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: "#4ade80" }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: "#22c55e" }}
          />
        </span>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Auto-refresh setiap 7 detik
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon }, i) => (
          <div key={i} className="vera-card p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {label}
              </p>
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: "rgba(0,102,204,0.1)" }}
              >
                <Icon className="w-4 h-4" style={{ color: "var(--primary)" }} />
              </div>
            </div>
            {isLoadingSummary ? (
              <div className="space-y-2">
                <div
                  className="h-7 w-28 rounded animate-pulse"
                  style={{ backgroundColor: "var(--muted)" }}
                />
                <div
                  className="h-3 w-20 rounded animate-pulse"
                  style={{ backgroundColor: "var(--muted)" }}
                />
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                  {value}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  {sub}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Recent Transactions + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table */}
        <div className="vera-card lg:col-span-2">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h3 className="font-bold" style={{ color: "var(--foreground)" }}>
              Transaksi Terbaru
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              Aktivitas terkini dari semua merchant
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th
                    className="text-left py-3 px-5 text-xs font-bold uppercase tracking-wider"
                    style={{
                      color: "var(--muted-foreground)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    Ref No
                  </th>
                  <th
                    className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider"
                    style={{
                      color: "var(--muted-foreground)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    Customer / Merchant
                  </th>
                  <th
                    className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider"
                    style={{
                      color: "var(--muted-foreground)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    Nominal
                  </th>
                  <th
                    className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider"
                    style={{
                      color: "var(--muted-foreground)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    Status
                  </th>
                  <th
                    className="text-right py-3 px-5 text-xs font-bold uppercase tracking-wider"
                    style={{
                      color: "var(--muted-foreground)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    Waktu
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRecent ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="py-4 px-5 text-center">
                        <div
                          className="h-4 rounded animate-pulse mx-auto"
                          style={{ backgroundColor: "var(--muted)", width: "80%" }}
                        />
                      </td>
                    </tr>
                  ))
                ) : recent?.data && recent.data.length > 0 ? (
                  recent.data.map((tx) => (
                    <tr
                      key={tx.id}
                      className="transition-colors"
                      style={{ borderBottom: "1px solid rgba(42,47,62,0.6)" }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.backgroundColor =
                          "rgba(42,47,62,0.3)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                      }
                    >
                      <td className="py-3 px-5 font-mono text-xs font-medium">
                        {tx.ref}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                          {tx.customerId || "-"}
                        </div>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {tx.merchantName || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                        {formatRupiah(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {formatStatus(tx.status)}
                      </td>
                      <td
                        className="py-3 px-5 text-right text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {new Date(tx.createdAt).toLocaleTimeString("id-ID")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Belum ada transaksi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="vera-card">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h3 className="font-bold" style={{ color: "var(--foreground)" }}>
              Ringkasan Status
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              Semua waktu
            </p>
          </div>
          <div className="p-5 space-y-4">
            {isLoadingSummary ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded animate-pulse"
                  style={{ backgroundColor: "var(--muted)" }}
                />
              ))
            ) : summary?.byStatus ? (
              summary.byStatus.map((s) => {
                const colors: Record<string, string> = {
                  SUKSES: "#4ade80",
                  MENUNGGU: "#facc15",
                  GAGAL: "#f87171",
                  KEDALUWARSA: "#9ca3af",
                };
                const bgColors: Record<string, string> = {
                  SUKSES: "rgba(74,222,128,0.15)",
                  MENUNGGU: "rgba(250,204,21,0.15)",
                  GAGAL: "rgba(248,113,113,0.15)",
                  KEDALUWARSA: "rgba(156,163,175,0.15)",
                };
                const pct = summary.totalTransactions > 0
                  ? Math.round((s.count / summary.totalTransactions) * 100)
                  : 0;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: colors[s.status] || "#9ca3af" }}
                        />
                        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                          {s.status}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-bold" style={{ color: "var(--foreground)" }}>
                        {s.count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: colors[s.status] || "#9ca3af",
                        }}
                      />
                    </div>
                    <div
                      className="text-xs text-right mt-1 font-mono"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {formatRupiah(s.amount)}
                    </div>
                  </div>
                );
              })
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
