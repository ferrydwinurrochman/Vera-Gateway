import React, { useState } from "react";
import {
  useListSuksesTransactions,
  getListSuksesTransactionsQueryKey,
} from "@workspace/api-client-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { CheckCircle2, RefreshCw } from "lucide-react";

export function Sukses() {
  const [page, setPage] = useState(1);

  const queryParams = { page, limit: 15 };

  const { data, isLoading, refetch } = useListSuksesTransactions(queryParams, {
    query: { queryKey: getListSuksesTransactionsQueryKey(queryParams) },
  });

  return (
    <div className="space-y-5">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" style={{ color: "#4ade80" }} />
          <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Hanya menampilkan transaksi dengan status SUKSES
          </span>
        </div>
        <button
          className="btn-alt"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div
        className="vera-card overflow-hidden"
        style={{ borderColor: "rgba(74,222,128,0.2)" }}
      >
        <div className="h-1 w-full" style={{ backgroundColor: "#22c55e" }} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Ref No", "Waktu Selesai", "Customer / Merchant", "Nominal", "Status"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`py-3 px-4 text-xs font-bold uppercase tracking-wider ${
                        i === 3 ? "text-right" : i === 4 ? "text-center" : "text-left"
                      }`}
                      style={{
                        color: "var(--muted-foreground)",
                        borderBottom: "1px solid var(--border)",
                        backgroundColor: "rgba(42,47,62,0.3)",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(42,47,62,0.5)" }}>
                    <td colSpan={5} className="py-4 text-center">
                      <div
                        className="h-4 rounded animate-pulse mx-auto"
                        style={{ backgroundColor: "var(--muted)", width: "70%" }}
                      />
                    </td>
                  </tr>
                ))
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((tx) => (
                  <tr
                    key={tx.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid rgba(42,47,62,0.5)" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor =
                        "rgba(42,47,62,0.3)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                    }
                  >
                    <td className="py-3 px-4 font-mono text-xs font-medium">{tx.ref}</td>
                    <td
                      className="py-3 px-4 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {formatDate(tx.updatedAt || tx.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{tx.customerId || "-"}</div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {tx.merchantName || "-"}
                      </div>
                    </td>
                    <td
                      className="py-3 px-4 text-right font-mono font-bold"
                      style={{ color: "#4ade80" }}
                    >
                      {formatRupiah(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="status-sukses">Sukses</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Belum ada transaksi sukses.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > 0 && (
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
              {(page - 1) * 15 + 1}–{Math.min(page * 15, data.total)} dari {data.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="btn-alt text-xs px-3 py-1.5"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                Sebelumnya
              </button>
              <span className="text-sm font-mono px-2" style={{ color: "#4ade80" }}>
                {page}
              </span>
              <button
                className="btn-alt text-xs px-3 py-1.5"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 15 >= data.total || isLoading}
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
