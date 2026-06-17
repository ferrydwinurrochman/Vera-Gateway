import React, { useState } from "react";
import {
  useListTransactions,
  getListTransactionsQueryKey,
  useCheckTransactionStatus,
} from "@workspace/api-client-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

function StatusBadge({ status }: { status: string }) {
  const cls = status.toLowerCase();
  return <span className={`badge ${cls}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

const statusOptions = ["all", "MENUNGGU", "SUKSES", "GAGAL", "KEDALUWARSA"];
const statusLabels: Record<string, string> = {
  all: "Semua Status",
  MENUNGGU: "Menunggu",
  SUKSES: "Sukses",
  GAGAL: "Gagal",
  KEDALUWARSA: "Kedaluwarsa",
};

export function Transaksi() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 500);
  const queryClient = useQueryClient();

  const queryParams = {
    page,
    limit: 15,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== "all" ? { status: status as any } : {}),
  };

  const { data, isLoading, refetch } = useListTransactions(queryParams, {
    query: { queryKey: getListTransactionsQueryKey(queryParams) },
  });

  const checkStatusMutation = useCheckTransactionStatus();

  const handleCheck = (ref: string) => {
    checkStatusMutation.mutate(
      { ref },
      {
        onSuccess: () => refetch(),
      }
    );
  };

  const totalPages = data ? Math.ceil(data.total / 15) : 1;

  return (
    <>
      {/* Filters */}
      <div className="filters">
        <div className="fg">
          <label>Cari Transaksi</label>
          <input
            type="text"
            placeholder="REF atau Customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 240 }}
          />
        </div>
        <div className="fg">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>
        </div>
        <div className="fg" style={{ justifyContent: "flex-end" }}>
          <label>&nbsp;</label>
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
      </div>

      {/* Table */}
      <div className="tablecard">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ref No</th>
                <th>Waktu</th>
                <th>Customer / Merchant</th>
                <th style={{ textAlign: "right" }}>Nominal</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="empty" style={{ padding: "12px 16px" }}>
                      <div style={{ height: 14, background: "var(--line)", borderRadius: 6, animation: "pulse 1.5s ease-in-out infinite" }} />
                    </td>
                  </tr>
                ))
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((tx) => (
                  <tr key={tx.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{tx.ref}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{formatDate(tx.createdAt)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tx.customerId || "-"}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{tx.merchantName || "-"}</div>
                    </td>
                    <td className="amt mono" style={{ textAlign: "right" }}>{formatRupiah(tx.amount)}</td>
                    <td style={{ textAlign: "center" }}>
                      <StatusBadge status={tx.status} />
                    </td>
                    <td style={{ textAlign: "right" }} className="act">
                      {tx.status === "MENUNGGU" && (
                        <button
                          className="abtn"
                          onClick={() => handleCheck(tx.ref)}
                          disabled={checkStatusMutation.isPending}
                          title="Cek status dari provider"
                        >
                          <RefreshCw style={{ width: 12, height: 12 }} />
                          Cek
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty">Tidak ada transaksi yang ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="pager">
            <span className="info">
              {(page - 1) * 15 + 1}–{Math.min(page * 15, data.total)} dari {data.total} transaksi
            </span>
            <div className="nums">
              <button
                className={`pg${page === 1 ? " dis" : ""}`}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    className={`pg${page === p ? " on" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 7 && page < totalPages && (
                <button className="pg dots">…</button>
              )}
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
