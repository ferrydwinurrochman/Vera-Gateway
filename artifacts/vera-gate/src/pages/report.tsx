import React, { useState, useMemo } from "react";
import { useListTransactions, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, TrendingUp, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type GroupMode = "hari" | "minggu" | "bulan" | "tahun" | "custom";

const LABELS: Record<GroupMode, string> = {
  hari: "Harian", minggu: "Mingguan", bulan: "Bulanan", tahun: "Tahunan", custom: "Custom",
};
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function getKey(mode: GroupMode, date: Date): { key: string; label: string } {
  const grp = mode === "custom" ? "hari" : mode;
  if (grp === "hari") {
    const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
    return { key: `${y}-${m}-${d}`, label: `${d}/${m}/${y}` };
  }
  if (grp === "minggu") {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const week = Math.ceil(((date.getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay() + 1) / 7);
    return { key: `${date.getFullYear()}-W${String(week).padStart(2, "0")}`, label: `Pekan ${week} / ${date.getFullYear()}` };
  }
  if (grp === "tahun") return { key: String(date.getFullYear()), label: String(date.getFullYear()) };
  const m = date.getMonth() + 1, y = date.getFullYear();
  return { key: `${y}-${String(m).padStart(2, "0")}`, label: `${BULAN[m - 1]} ${y}` };
}

interface Bucket { label: string; total: number; sukses: number; amt: number; menunggu: number; gagal: number; }

export function Report() {
  const [mode, setMode] = useState<GroupMode>("hari");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const qp: any = { limit: 1000 };
  if (mode === "hari") { const t = new Date().toISOString().slice(0, 10); qp.startDate = t; qp.endDate = t; }
  else if (mode === "bulan") { qp.startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10); qp.endDate = new Date().toISOString().slice(0, 10); }
  else if (mode === "tahun") { qp.startDate = `${new Date().getFullYear()}-01-01`; qp.endDate = new Date().toISOString().slice(0, 10); }
  else if (mode === "custom") { if (startDate) qp.startDate = startDate; if (endDate) qp.endDate = endDate; }

  const { data, isLoading } = useListTransactions(qp, { query: { queryKey: getListTransactionsQueryKey(qp) } });
  const { data: allData } = useListTransactions({ limit: 1000 }, { query: { queryKey: getListTransactionsQueryKey({ limit: 1000 }) } });

  const rows = data?.data ?? [];
  const allRows = allData?.data ?? [];

  const buckets = useMemo(() => {
    const bk: Record<string, Bucket> = {};
    for (const r of rows) {
      const d = new Date(r.createdAt);
      const { key, label } = getKey(mode, d);
      if (!bk[key]) bk[key] = { label, total: 0, sukses: 0, amt: 0, menunggu: 0, gagal: 0 };
      bk[key].total++;
      const s = r.status?.toUpperCase();
      if (s === "SUKSES") { bk[key].sukses++; bk[key].amt += r.amount; }
      else if (s === "MENUNGGU") bk[key].menunggu++;
      else if (s === "GAGAL") bk[key].gagal++;
    }
    return Object.entries(bk).sort((a, b) => b[0].localeCompare(a[0])).map(([, v]) => v);
  }, [rows, mode]);

  const summary = useMemo(() => {
    const s = { total: 0, sukses: 0, sukses_amt: 0, menunggu: 0, gagal: 0 };
    for (const r of rows) {
      s.total++;
      const st = r.status?.toUpperCase();
      if (st === "SUKSES") { s.sukses++; s.sukses_amt += r.amount; }
      else if (st === "MENUNGGU") s.menunggu++;
      else if (st === "GAGAL") s.gagal++;
    }
    return s;
  }, [rows]);

  const perMethod = useMemo(() => {
    const m: Record<string, { n: number; amt: number }> = {};
    for (const r of allRows) {
      if (r.status?.toUpperCase() === "SUKSES" && r.method && r.method !== "-") {
        if (!m[r.method]) m[r.method] = { n: 0, amt: 0 };
        m[r.method].n++; m[r.method].amt += r.amount;
      }
    }
    return Object.entries(m).map(([nama, v]) => ({ nama, ...v })).sort((a, b) => b.amt - a.amt);
  }, [allRows]);

  const rangetxt = mode === "custom" ? ` (${startDate || "awal"} s/d ${endDate || "kini"})` : "";

  const handlePrint = () => {
    const printRows = rows.map(r =>
      `<tr><td>${new Date(r.createdAt).toLocaleString("id-ID")}</td><td>${r.customerId ?? ""}</td><td>${r.notes ?? ""}</td><td>${r.method ?? ""}</td><td>${r.amount}</td><td>${r.status ?? ""}</td><td>${r.ref}</td></tr>`
    ).join("");
    const bkRows = buckets.map(b =>
      `<tr><td>${b.label}</td><td>${b.total}</td><td>${b.sukses}</td><td>Rp ${b.amt.toLocaleString("id-ID")}</td><td>${b.menunggu}</td><td>${b.gagal}</td></tr>`
    ).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Laporan VERA GATE</title>
      <style>body{font-family:Arial;padding:26px;color:#13243A}h1{margin:0 0 2px;font-size:20px}h2{font-size:14px;margin:20px 0 4px}.sub{color:#667;margin-bottom:16px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}th,td{border:1px solid #ddd;padding:7px 9px;text-align:left}th{background:#16304F;color:#fff}.cards{display:flex;gap:12px;margin-bottom:14px}.c{border:1px solid #ddd;border-radius:8px;padding:9px 14px;font-size:12px}.c b{display:block;font-size:17px;margin-top:3px}.btn{background:#16304F;color:#fff;border:none;padding:9px 16px;border-radius:8px;font-weight:700;cursor:pointer}@media print{.noprint{display:none}}</style></head><body>
      <div class="noprint" style="text-align:right;margin-bottom:10px"><button class="btn" onclick="window.print()">Cetak / Simpan PDF</button></div>
      <h1>VERA GATE — Laporan Transaksi</h1><div class="sub">VERA GATE · Rekap ${LABELS[mode]}${rangetxt} · Dicetak: ${new Date().toLocaleString("id-ID")} WIB</div>
      <div class="cards"><div class="c">Total<b>${summary.total}</b></div><div class="c">Sukses<b>${summary.sukses}</b></div><div class="c">Nominal<b>Rp ${summary.sukses_amt.toLocaleString("id-ID")}</b></div><div class="c">Menunggu/Gagal<b>${summary.menunggu}/${summary.gagal}</b></div></div>
      <h2>Ringkasan ${LABELS[mode]}${rangetxt}</h2><table><thead><tr><th>Periode</th><th>Transaksi</th><th>Sukses</th><th>Nominal Sukses</th><th>Menunggu</th><th>Gagal</th></tr></thead><tbody>${bkRows || '<tr><td colspan="6">Belum ada transaksi.</td></tr>'}</tbody></table>
      <h2>Detail Transaksi</h2><table><thead><tr><th>Tanggal</th><th>Username</th><th>Pengirim</th><th>Metode</th><th>Nominal</th><th>Status</th><th>Ref No</th></tr></thead><tbody>${printRows || '<tr><td colspan="7">Belum ada transaksi.</td></tr>'}</tbody></table>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);}<\/script></body></html>`);
    w.document.close();
  };

  const statCards = [
    { label: "Total", value: summary.total, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    { label: "Sukses", value: summary.sukses, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Nominal Sukses", value: formatRupiah(summary.sukses_amt), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", mono: true },
    { label: "Menunggu / Gagal", value: `${summary.menunggu} / ${summary.gagal}`, icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ringkasan transaksi berdasarkan periode.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer size={14} className="mr-2" />
          Cetak / PDF
        </Button>
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
              <div className={cn("text-xl font-bold tracking-tight", (s as any).mono && "font-mono text-base")}>
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Period tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as GroupMode)}>
        <TabsList className="h-9">
          {(Object.keys(LABELS) as GroupMode[]).map((k) => (
            <TabsTrigger key={k} value={k} className="text-xs px-3">
              {LABELS[k]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {mode === "custom" && (
        <Card className="shadow-none">
          <CardContent className="px-4 py-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Dari tanggal</p>
                <Input type="date" className="h-9 w-44 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Sampai tanggal</p>
                <Input type="date" className="h-9 w-44 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary table */}
      <Card className="shadow-none overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-4 border-b border-border">
          <CardTitle className="text-sm pb-3">Ringkasan {LABELS[mode]}{rangetxt}</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs">Periode</TableHead>
                <TableHead className="text-xs">Transaksi</TableHead>
                <TableHead className="text-xs">Sukses</TableHead>
                <TableHead className="text-xs">Nominal Sukses</TableHead>
                <TableHead className="text-xs">Menunggu</TableHead>
                <TableHead className="text-xs">Gagal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">Memuat...</TableCell></TableRow>
              ) : buckets.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">Belum ada transaksi pada periode ini.</TableCell></TableRow>
              ) : buckets.map((b, i) => (
                <TableRow key={i} className="text-sm">
                  <TableCell className="font-semibold">{b.label}</TableCell>
                  <TableCell>{b.total}</TableCell>
                  <TableCell className="text-green-600 font-medium">{b.sukses}</TableCell>
                  <TableCell className="font-mono font-semibold">{formatRupiah(b.amt)}</TableCell>
                  <TableCell className="text-yellow-600">{b.menunggu}</TableCell>
                  <TableCell className="text-destructive">{b.gagal}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Per-method table */}
      <Card className="shadow-none overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-4 border-b border-border">
          <CardTitle className="text-sm pb-3">Per Metode Bayar (sukses, semua waktu)</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs">Metode</TableHead>
                <TableHead className="text-xs">Transaksi</TableHead>
                <TableHead className="text-xs">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perMethod.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">Belum ada pembayaran sukses.</TableCell></TableRow>
              ) : perMethod.map((m, i) => (
                <TableRow key={i} className="text-sm">
                  <TableCell className="font-medium">{m.nama}</TableCell>
                  <TableCell>{m.n}</TableCell>
                  <TableCell className="font-mono font-semibold">{formatRupiah(m.amt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
