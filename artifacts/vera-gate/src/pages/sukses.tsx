import React, { useState } from "react";
import {
  useListSuksesTransactions,
  getListSuksesTransactionsQueryKey,
} from "@workspace/api-client-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

export function Sukses() {
  const [page, setPage] = useState(1);

  const queryParams = { page, limit: 15 };

  const { data, isLoading, refetch } = useListSuksesTransactions(queryParams, {
    query: { queryKey: getListSuksesTransactionsQueryKey(queryParams) },
  });

  const totalPages = data ? Math.ceil(data.total / 15) : 1;

  return (
    <>
      {/* Header action */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
          <span className="muted" style={{ fontSize: 13 }}>Hanya menampilkan transaksi dengan status SUKSES</span>
        </div>
        <button
          className="btn alt sm"
          onClick={() => refetch()}
          disabled={isLoading}
          style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="tablecard">
        <div style={{ height: 3, background: "var(--green)" }} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ref No</th>
                <th>Waktu Selesai</th>
                <th>Customer / Merchant</th>
                <th style={{ textAlign: "right" }}>Nominal</th>
                <th style={{ textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="empty" style={{ padding: "12px 16px" }}>
                      <div style={{ height: 14, background: "var(--line)", borderRadius: 6, animation: "pulse 1.5s ease-in-out infinite" }} />
                    </td>
                  </tr>
                ))
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((tx) => (
                  <tr key={tx.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{tx.ref}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{formatDate(tx.updatedAt || tx.createdAt)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tx.customerId || "-"}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{tx.merchantName || "-"}</div>
                    </td>
                    <td className="amt mono" style={{ textAlign: "right", color: "var(--green)" }}>{formatRupiah(tx.amount)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge sukses">Sukses</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty">Belum ada transaksi sukses.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > 0 && (
          <div className="pager">
            <span className="info">{(page - 1) * 15 + 1}–{Math.min(page * 15, data.total)} dari {data.total}</span>
            <div className="nums">
              <button
                className={`pg${page === 1 ? " dis" : ""}`}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                ‹
              </button>
              <button className="pg on">{page}</button>
              <button
                className={`pg${page * 15 >= data.total ? " dis" : ""}`}
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 15 >= data.total || isLoading}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
