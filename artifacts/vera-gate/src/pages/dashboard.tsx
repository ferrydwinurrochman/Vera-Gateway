import React, { useState } from "react";
import { useListTransactions, getListTransactionsQueryKey, useCheckTransactionStatus } from "@workspace/api-client-react";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { formatRupiah } from "@/lib/utils";

const METODE = ["QRIS", "GoPay", "OVO", "Dana", "ShopeePay", "LinkAja", "BCA", "BRI", "BNI", "Mandiri", "DANA"];
const DOT_CLASS: Record<string, string> = {
  GoPay: "gopay", OVO: "ovo", Dana: "dana", ShopeePay: "shopeepay", LinkAja: "linkaja",
  QRIS: "qris", BCA: "bank", BRI: "bank", BNI: "bank", Mandiri: "bank",
};

function formatJam(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " +
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function getDateRange(periode: string, startCustom: string, endCustom: string) {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (periode === "hari") return { startDate: fmt(today), endDate: fmt(today) };
  if (periode === "bulan") return { startDate: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: fmt(today) };
  if (periode === "tahun") return { startDate: fmt(new Date(today.getFullYear(), 0, 1)), endDate: fmt(today) };
  if (periode === "custom") return { startDate: startCustom || undefined, endDate: endCustom || undefined };
  return {};
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

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

  const { data: summary } = useGetDashboardSummary({ period: "today" }, {
    query: { queryKey: getGetDashboardSummaryQueryKey({ period: "today" }), refetchInterval: 10000 },
  });

  const checkMutation = useCheckTransactionStatus();

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  const suksesCount = summary?.byStatus?.find(s => s.status === "SUKSES")?.count ?? 0;
  const menungguCount = summary?.byStatus?.find(s => s.status === "MENUNGGU")?.count ?? 0;
  const gagalCount = summary?.byStatus?.find(s => s.status === "GAGAL")?.count ?? 0;
  const suksesAmt = summary?.todayAmount ?? 0;

  const handlePeriode = (v: string) => {
    setPeriode(v);
    setPage(1);
    if (v !== "custom") { setStartDate(""); setEndDate(""); }
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatus(v); setPage(1); };
  const handlePerPage = (v: number) => { setPerPage(v); setPage(1); };

  function pageWindow(cur: number, last: number): (number | null)[] {
    const keep = new Set<number>();
    keep.add(1); keep.add(last);
    for (let p = cur - 2; p <= cur + 2; p++) if (p >= 1 && p <= last) keep.add(p);
    const sorted = Array.from(keep).sort((a, b) => a - b);
    const out: (number | null)[] = [];
    let prev = 0;
    for (const p of sorted) { if (prev && p - prev > 1) out.push(null); out.push(p); prev = p; }
    return out;
  }

  const loItem = total ? (page - 1) * perPage + 1 : 0;
  const hiItem = Math.min(page * perPage, total);

  return (
    <>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 12 }}>Transactions</div>

      <div className="summary">
        <div className="sc">
          <div className="l"><span className="ic" style={{ background: "var(--green-bg)" }}>✓</span>Total Sukses</div>
          <div className="v">{suksesCount}</div>
        </div>
        <div className="sc">
          <div className="l"><span className="ic" style={{ background: "var(--green-bg)" }}>₿</span>Nominal Sukses</div>
          <div className="v mono" style={{ fontSize: 19 }}>{formatRupiah(suksesAmt)}</div>
        </div>
        <div className="sc">
          <div className="l"><span className="ic" style={{ background: "var(--amber-bg)" }}>⏳</span>Menunggu</div>
          <div className="v">{menungguCount}</div>
        </div>
        <div className="sc">
          <div className="l"><span className="ic" style={{ background: "var(--red-bg)" }}>✕</span>Gagal</div>
          <div className="v">{gagalCount}</div>
        </div>
      </div>

      <form className="filters" onSubmit={e => e.preventDefault()}>
        <div className="fg" style={{ flex: 1, minWidth: 240 }}>
          <label>Cari (Ref No / Username / Metode)</label>
          <input
            id="f-search"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="ketik untuk mencari semua data..."
            autoComplete="off"
          />
        </div>
        <div className="fg">
          <label>Periode</label>
          <select value={periode} onChange={e => handlePeriode(e.target.value)}>
            <option value="semua">Semua</option>
            <option value="hari">Hari ini</option>
            <option value="bulan">Bulan ini</option>
            <option value="tahun">Tahun ini</option>
            <option value="custom">Rentang custom</option>
          </select>
        </div>
        <div className="fg">
          <label>Tgl Mulai</label>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
        </div>
        <div className="fg">
          <label>Tgl Akhir</label>
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
        </div>
        <div className="fg">
          <label>Status</label>
          <select value={status} onChange={e => handleStatus(e.target.value)}>
            <option value="all">Semua</option>
            <option value="SUKSES">Sukses</option>
            <option value="MENUNGGU">Menunggu</option>
            <option value="GAGAL">Gagal</option>
            <option value="KEDALUWARSA">Kedaluwarsa</option>
          </select>
        </div>
        <div className="fg">
          <label>Per halaman</label>
          <select value={perPage} onChange={e => handlePerPage(Number(e.target.value))}>
            {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button className="btn sm" type="submit">Terapkan</button>
        <button className="btn sm alt" type="button" onClick={() => {
          setSearch(""); setStatus("all"); setPeriode("hari"); setStartDate(""); setEndDate(""); setPage(1);
        }}>Reset</button>
      </form>

      <div className="tablecard">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Username</th>
                <th>Nama Pengirim</th>
                <th>Metode Bayar</th>
                <th>QRIS</th>
                <th>Nominal</th>
                <th>Status</th>
                <th>Ref No</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9}><div className="empty">Memuat data...</div></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9}><div className="empty">{search ? `Tidak ada hasil untuk "${search}".` : "Belum ada transaksi untuk filter ini."}</div></td></tr>
              ) : rows.map(tx => {
                const dotCls = DOT_CLASS[tx.method ?? ""] ?? "bank";
                const statusCls = (tx.status ?? "").toLowerCase();
                return (
                  <tr key={tx.id}>
                    <td className="mono muted">{formatJam(tx.createdAt)}</td>
                    <td>
                      <span className="uname">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                        </svg>
                        {tx.customerId ?? "—"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{tx.notes ?? "—"}</td>
                    <td>
                      {tx.method && tx.method !== "-" ? (
                        <span className="met"><span className={`d ${dotCls}`}></span>{tx.method}</span>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td className="muted" style={{ fontWeight: 600 }}>
                      {tx.qrCode ? "Flypay" : "Manual"}
                    </td>
                    <td className="amt">{formatRupiah(tx.amount)}</td>
                    <td>
                      <span className={`badge ${statusCls}`}>{(tx.status ?? "").toUpperCase()}</span>
                    </td>
                    <td className="mono muted">{tx.ref}</td>
                    <td className="act">
                      <button className="abtn" onClick={() => {
                        checkMutation.mutate({ ref: tx.ref }, {
                          onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(queryParams) }),
                        });
                      }}>Cek</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <div className="info">Menampilkan {loItem}–{hiItem} dari {total} transaksi</div>
          <div className="nums">
            <button className={`pg${page <= 1 ? " dis" : ""}`} onClick={() => page > 1 && setPage(page - 1)}>‹</button>
            {pageWindow(page, pages).map((p, i) =>
              p === null
                ? <span key={`dot-${i}`} className="pg dots">…</span>
                : <button key={p} className={`pg${p === page ? " on" : ""}`} onClick={() => setPage(p)}>{p}</button>
            )}
            <button className={`pg${page >= pages ? " dis" : ""}`} onClick={() => page < pages && setPage(page + 1)}>›</button>
          </div>
        </div>
      </div>
    </>
  );
}
