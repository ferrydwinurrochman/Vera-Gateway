import React, { useState } from "react";
import {
  useListTransactions,
  getListTransactionsQueryKey,
  useCheckTransactionStatus,
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { formatRupiah, getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatJam(iso: string) {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

function getDateRange(periode: string, startCustom: string, endCustom: string) {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (periode === "hari") return { startDate: fmt(today), endDate: fmt(today) };
  if (periode === "bulan")
    return {
      startDate: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: fmt(today),
    };
  if (periode === "tahun")
    return { startDate: fmt(new Date(today.getFullYear(), 0, 1)), endDate: fmt(today) };
  if (periode === "custom")
    return { startDate: startCustom || undefined, endDate: endCustom || undefined };
  return {};
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

function pageWindow(cur: number, last: number): (number | null)[] {
  const keep = new Set<number>();
  keep.add(1);
  keep.add(last);
  for (let p = cur - 2; p <= cur + 2; p++) if (p >= 1 && p <= last) keep.add(p);
  const sorted = Array.from(keep).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push(null);
    out.push(p);
    prev = p;
  }
  return out;
}

export function Dashboard() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [periode, setPeriode] = useState("hari");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const debouncedSearch = useDebounce(search, 450);
  const queryClient = useQueryClient();

  const dateRange = getDateRange(periode, startDate, endDate);
  const queryParams: any = {
    page,
    limit: perPage,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== "all" ? { status } : {}),
    ...dateRange,
  };

  const { data, isLoading } = useListTransactions(queryParams, {
    query: { queryKey: getListTransactionsQueryKey(queryParams), refetchInterval: 10000 },
  });
  const { data: summary } = useGetDashboardSummary(
    { period: "today" },
    {
      query: {
        queryKey: getGetDashboardSummaryQueryKey({ period: "today" }),
        refetchInterval: 10000,
      },
    }
  );
  const checkMutation = useCheckTransactionStatus();

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const loItem = total ? (page - 1) * perPage + 1 : 0;
  const hiItem = Math.min(page * perPage, total);

  const suksesCount = summary?.byStatus?.find((s) => s.status === "SUKSES")?.count ?? 0;
  const menungguCount = summary?.byStatus?.find((s) => s.status === "MENUNGGU")?.count ?? 0;
  const gagalCount = summary?.byStatus?.find((s) => s.status === "GAGAL")?.count ?? 0;
  const suksesAmt = summary?.todayAmount ?? 0;

  const handlePeriode = (v: string) => {
    setPeriode(v);
    setPage(1);
    if (v !== "custom") { setStartDate(""); setEndDate(""); }
  };
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatus(v); setPage(1); };
  const handlePerPage = (v: number) => { setPerPage(v); setPage(1); };

  const statCards = [
    {
      label: "Total Sukses",
      value: suksesCount,
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "Nominal Sukses",
      value: formatRupiah(suksesAmt),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
      mono: true,
    },
    {
      label: "Menunggu",
      value: menungguCount,
      icon: Clock,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Gagal",
      value: gagalCount,
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pantau semua transaksi secara real-time</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", s.bg)}>
                  <s.icon size={14} className={s.color} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={cn("text-xl font-bold tracking-tight", s.mono && "font-mono text-base")}>
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="shadow-none">
        <CardContent className="px-4 py-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-48">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 text-sm"
                  placeholder="Cari ref no / username / metode..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <Select value={periode} onValueChange={handlePeriode}>
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua</SelectItem>
                <SelectItem value="hari">Hari ini</SelectItem>
                <SelectItem value="bulan">Bulan ini</SelectItem>
                <SelectItem value="tahun">Tahun ini</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {periode === "custom" && (
              <>
                <Input
                  type="date"
                  className="h-9 w-38 text-sm"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                />
                <Input
                  type="date"
                  className="h-9 w-38 text-sm"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                />
              </>
            )}
            <Select value={status} onValueChange={handleStatus}>
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="SUKSES">Sukses</SelectItem>
                <SelectItem value="MENUNGGU">Menunggu</SelectItem>
                <SelectItem value="GAGAL">Gagal</SelectItem>
                <SelectItem value="KEDALUWARSA">Kedaluwarsa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(perPage)} onValueChange={(v) => handlePerPage(Number(v))}>
              <SelectTrigger className="h-9 w-28 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PER_PAGE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / hal</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => { setSearch(""); setStatus("all"); setPeriode("hari"); setStartDate(""); setEndDate(""); setPage(1); }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs">Tanggal</TableHead>
                <TableHead className="text-xs">Username</TableHead>
                <TableHead className="text-xs">Nama Pengirim</TableHead>
                <TableHead className="text-xs">Metode</TableHead>
                <TableHead className="text-xs">QRIS</TableHead>
                <TableHead className="text-xs">Nominal</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Ref No</TableHead>
                <TableHead className="text-xs text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-sm">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-sm">
                    {search ? `Tidak ada hasil untuk "${search}".` : "Belum ada transaksi untuk filter ini."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((tx) => (
                  <TableRow key={tx.id} className="text-sm">
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatJam(tx.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <User size={11} className="text-muted-foreground" />
                        {tx.customerId ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{tx.notes ?? "—"}</TableCell>
                    <TableCell>
                      {tx.method && tx.method !== "-" ? (
                        <span className="text-xs font-medium">{tx.method}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">
                      {tx.qrCode ? "Flypay" : "Manual"}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-sm">
                      {formatRupiah(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", getStatusColor(tx.status ?? ""))}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{tx.ref}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          checkMutation.mutate(
                            { ref: tx.ref },
                            {
                              onSuccess: () =>
                                queryClient.invalidateQueries({
                                  queryKey: getListTransactionsQueryKey(queryParams),
                                }),
                            }
                          );
                        }}
                      >
                        <RefreshCw size={11} className="mr-1" />
                        Cek
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {total > 0 ? `Menampilkan ${loItem}–${hiItem} dari ${total}` : "Tidak ada data"}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => page > 1 && setPage(page - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            {pageWindow(page, pages).map((p, i) =>
              p === null ? (
                <span key={`dot-${i}`} className="px-1 text-muted-foreground text-xs">…</span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "ghost"}
                  size="sm"
                  className="h-7 min-w-7 px-2 text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page >= pages}
              onClick={() => page < pages && setPage(page + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
