import React, { useState } from "react";
import {
  useListTransactions,
  getListTransactionsQueryKey,
  useCheckTransactionStatus,
} from "@workspace/api-client-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "SUKSES": return <span className="status-sukses">Sukses</span>;
    case "MENUNGGU": return <span className="status-menunggu">Menunggu</span>;
    case "GAGAL": return <span className="status-gagal">Gagal</span>;
    case "KEDALUWARSA": return <span className="status-kedaluwarsa">Kedaluwarsa</span>;
    default: return <span className="status-kedaluwarsa">{status}</span>;
  }
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
  const { toast } = useToast();
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

  const handleCheck = (id: number) => {
    checkStatusMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Status berhasil diperbarui" });
          refetch();
        },
        onError: (error: any) => {
          toast({
            title: "Gagal memperbarui status",
            description: error?.error?.error || "Terjadi kesalahan",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--muted-foreground)" }}
            />
            <input
              type="text"
              placeholder="Cari REF atau Customer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="vera-input pl-9"
              style={{ minWidth: "240px" }}
            />
          </div>
          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="vera-input"
            style={{ minWidth: "160px" }}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>
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
      <div className="vera-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Ref No", "Waktu", "Customer / Merchant", "Nominal", "Status", "Aksi"].map((h, i) => (
                  <th
                    key={h}
                    className={`py-3 px-4 text-xs font-bold uppercase tracking-wider ${i >= 3 ? "text-right" : "text-left"} ${i === 4 ? "text-center" : ""}`}
                    style={{
                      color: "var(--muted-foreground)",
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: "rgba(42,47,62,0.3)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(42,47,62,0.5)" }}>
                    <td colSpan={6} className="py-4 px-4 text-center">
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
                    <td className="py-3 px-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{tx.customerId || "-"}</div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {tx.merchantName || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {formatRupiah(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {tx.status === "MENUNGGU" && (
                        <button
                          className="btn-action"
                          onClick={() => handleCheck(tx.id)}
                          disabled={checkStatusMutation.isPending}
                          title="Cek status dari provider"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Cek
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Tidak ada transaksi yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
              <span
                className="text-sm font-mono px-2"
                style={{ color: "var(--foreground)" }}
              >
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
