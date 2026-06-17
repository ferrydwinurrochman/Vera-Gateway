import React, { useState } from "react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function trow(title: string, desc: string, action: React.ReactNode) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
      <div>
        <div style={{ fontWeight: 700 }} dangerouslySetInnerHTML={{ __html: title }} />
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{desc}</div>
      </div>
      {action}
    </div>
  );
}

export function Tools() {
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [nominal, setNominal] = useState("");
  const [flash, setFlash] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [resetting, setResetting] = useState(false);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Pastikan nomor rekening dan nominal sudah benar. Lanjutkan pencairan?")) return;
    setFlash({ msg: "Fitur disbursement via API Flypay memerlukan konfigurasi kredensial live di Pengaturan Provider.", type: "err" });
  };

  const handleReset = async () => {
    if (!confirm("Reset semua transaksi? Tindakan ini tidak bisa dibatalkan.")) return;
    setResetting(true);
    try {
      const res = await fetch(`${BASE}/api/transactions/reset`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setFlash({ msg: data.message || "Data transaksi berhasil direset.", type: "ok" });
      } else {
        setFlash({ msg: data.error || "Gagal reset data.", type: "err" });
      }
    } catch {
      setFlash({ msg: "Gagal terhubung ke server.", type: "err" });
    } finally {
      setResetting(false);
    }
  };

  const handleExportCsv = () => { window.location.href = `${BASE}/api/transactions/export-csv`; };
  const handleExportJson = () => { window.location.href = `${BASE}/api/transactions/export-json`; };
  const handlePrintPdf = () => { window.open(`${window.location.origin}/report`, "_blank"); };

  return (
    <>
      {flash && (
        <div className={`flash ${flash.type}`} style={{ marginBottom: 16 }}>{flash.msg}</div>
      )}

      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Tarik Dana (Disbursement)</div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
        Kirim saldo ke rekening bank / e-wallet via API Flypay.
      </div>

      <div className="tablecard" style={{ padding: 22, maxWidth: 580, marginBottom: 24, border: "2px solid var(--blue)" }}>
        <form onSubmit={handleWithdraw}>
          <div className="field">
            <label>Bank / E-Wallet Tujuan (Sesuai Singkatan Flypay)</label>
            <input
              name="bankCode"
              value={bankCode}
              onChange={e => setBankCode(e.target.value)}
              required
              placeholder="cth: BCA, BRI, MANDIRI, DANA, OVO"
            />
          </div>
          <div className="field">
            <label>Nomor Rekening / HP E-Wallet</label>
            <input
              name="accountNumber"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              required
              placeholder="cth: 0123456789"
            />
          </div>
          <div className="field">
            <label>Nama Pemilik Rekening</label>
            <input
              name="accountName"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              required
              placeholder="cth: Budi Santoso"
            />
          </div>
          <div className="field">
            <label>Nominal Penarikan</label>
            <div className="ip-rp">
              <span className="pre">Rp</span>
              <input
                name="nominal"
                inputMode="numeric"
                value={nominal}
                onChange={e => setNominal(e.target.value.replace(/[^0-9]/g, ""))}
                required
                placeholder="cth: 100000"
              />
            </div>
          </div>
          <button className="btn" type="submit">Cairkan Dana Sekarang</button>
        </form>
      </div>

      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Tools</div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>Kelola data & ekspor transaksi.</div>

      <div className="tablecard" style={{ padding: 22, maxWidth: 580, display: "flex", flexDirection: "column", gap: 16 }}>
        {trow(
          "Ekspor CSV",
          "Unduh semua transaksi (Excel-friendly).",
          <button className="btn sm" onClick={handleExportCsv}>Unduh CSV</button>
        )}
        {trow(
          "Ekspor JSON",
          "Cadangan data mentah.",
          <button className="btn sm" onClick={handleExportJson}>Unduh JSON</button>
        )}
        {trow(
          "Cetak / PDF",
          "Buka tampilan cetak lalu Simpan sebagai PDF.",
          <button className="btn sm" onClick={handlePrintPdf}>Buka PDF</button>
        )}
        {trow(
          '<span style="color:var(--red)">Reset Data</span>',
          "Hapus semua transaksi merchant ini.",
          <button
            className="btn sm"
            style={{ background: "var(--red)" }}
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? "Mereset..." : "Reset"}
          </button>
        )}
      </div>
    </>
  );
}
