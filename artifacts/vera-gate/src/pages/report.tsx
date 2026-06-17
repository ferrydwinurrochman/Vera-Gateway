import React, { useState, useMemo } from "react";
import { useListTransactions, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { formatRupiah } from "@/lib/utils";

type GroupMode = "hari" | "minggu" | "bulan" | "tahun" | "custom";

const LABELS: Record<GroupMode, string> = {
  hari: "Harian", minggu: "Mingguan", bulan: "Bulanan", tahun: "Tahunan", custom: "Custom",
};

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

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
  if (grp === "tahun") {
    return { key: String(date.getFullYear()), label: String(date.getFullYear()) };
  }
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

  const { data, isLoading } = useListTransactions(qp, {
    query: { queryKey: getListTransactionsQueryKey(qp) },
  });

  const { data: allData } = useListTransactions({ limit: 1000 }, {
    query: { queryKey: getListTransactionsQueryKey({ limit: 1000 }) },
  });

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

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Report</div>
        <button className="btn sm" onClick={handlePrint}>Cetak / PDF</button>
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
        Ringkasan transaksi. Pilih periode untuk rekap per hari, minggu, bulan, tahun, atau rentang tanggal sendiri.
      </div>

      <div className="summary">
        <div className="sc"><div className="l">Total Transaksi</div><div className="v" style={{ fontSize: 20 }}>{summary.total}</div></div>
        <div className="sc"><div className="l">Sukses</div><div className="v" style={{ fontSize: 20 }}>{summary.sukses}</div></div>
        <div className="sc"><div className="l">Nominal Sukses</div><div className="v" style={{ fontSize: 20 }}>{formatRupiah(summary.sukses_amt)}</div></div>
        <div className="sc"><div className="l">Menunggu / Gagal</div><div className="v" style={{ fontSize: 20 }}>{summary.menunggu} / {summary.gagal}</div></div>
      </div>

      <div className="apis" style={{ marginBottom: 14 }}>
        {(Object.keys(LABELS) as GroupMode[]).map(k => (
          <a key={k} className={`apitab${mode === k ? " on" : ""}`} href="#" onClick={e => { e.preventDefault(); setMode(k); }}>
            <span className="dot"></span>{LABELS[k]}
          </a>
        ))}
      </div>

      {mode === "custom" && (
        <div className="tablecard" style={{ padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Dari tanggal</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Sampai tanggal</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="tablecard">
        <div style={{ padding: "14px 16px", fontWeight: 800, fontSize: 14, borderBottom: "1px solid var(--line)" }}>
          Ringkasan {LABELS[mode]}{rangetxt}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Periode</th><th>Transaksi</th><th>Sukses</th><th>Nominal Sukses</th><th>Menunggu</th><th>Gagal</th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6}><div className="empty">Memuat...</div></td></tr>
              ) : buckets.length === 0 ? (
                <tr><td colSpan={6}><div className="empty">Belum ada transaksi pada periode ini.</div></td></tr>
              ) : buckets.map((b, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{b.label}</td>
                  <td>{b.total}</td>
                  <td>{b.sukses}</td>
                  <td className="amt">{formatRupiah(b.amt)}</td>
                  <td>{b.menunggu}</td>
                  <td>{b.gagal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tablecard" style={{ marginTop: 16 }}>
        <div style={{ padding: "14px 16px", fontWeight: 800, fontSize: 14, borderBottom: "1px solid var(--line)" }}>
          Per Metode Bayar (sukses, semua waktu)
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Metode</th><th>Transaksi</th><th>Nominal</th></tr>
            </thead>
            <tbody>
              {perMethod.length === 0 ? (
                <tr><td colSpan={3}><div className="empty">Belum ada pembayaran sukses.</div></td></tr>
              ) : perMethod.map((m, i) => (
                <tr key={i}>
                  <td><span className="met"><span className="d bank"></span>{m.nama}</span></td>
                  <td>{m.n}</td>
                  <td className="amt">{formatRupiah(m.amt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
