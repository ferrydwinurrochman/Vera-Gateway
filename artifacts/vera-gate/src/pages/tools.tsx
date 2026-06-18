import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Banknote,
  Download,
  FileJson,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const BANKS = ["BCA", "BRI", "BNI", "MANDIRI", "DANA", "OVO", "GOPAY", "SHOPEEPAY"];

export function Tools() {
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [nominal, setNominal] = useState("");
  const [alert, setAlert] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [resetting, setResetting] = useState(false);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Pastikan nomor rekening dan nominal sudah benar. Lanjutkan pencairan?")) return;
    setAlert({ msg: "Fitur disbursement via API Flypay memerlukan konfigurasi kredensial live di Pengaturan Provider.", type: "err" });
  };

  const handleReset = async () => {
    if (!confirm("Reset semua transaksi? Tindakan ini tidak bisa dibatalkan.")) return;
    setResetting(true);
    try {
      const res = await fetch(`${BASE}/api/transactions/reset`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setAlert({ msg: data.message || "Data transaksi berhasil direset.", type: "ok" });
      } else {
        setAlert({ msg: data.error || "Gagal reset data.", type: "err" });
      }
    } catch {
      setAlert({ msg: "Gagal terhubung ke server.", type: "err" });
    } finally {
      setResetting(false);
    }
  };

  const handleExportCsv = () => { window.location.href = `${BASE}/api/transactions/export-csv`; };
  const handleExportJson = () => { window.location.href = `${BASE}/api/transactions/export-json`; };
  const handlePrintPdf = () => { window.open(`${window.location.origin}/report`, "_blank"); };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Tools</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Disbursement, ekspor data, dan manajemen sistem.</p>
      </div>

      {alert && (
        <div
          className={`px-4 py-3 rounded-lg border text-sm flex items-start gap-2 ${
            alert.type === "ok"
              ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          {alert.msg}
        </div>
      )}

      {/* Disbursement */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote size={16} />
            Tarik Dana (Disbursement)
          </CardTitle>
          <CardDescription>Kirim saldo ke rekening bank / e-wallet via API Flypay.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Bank / E-Wallet Tujuan</Label>
              <Select value={bankCode} onValueChange={setBankCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bank / e-wallet" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-no">Nomor Rekening / HP E-Wallet</Label>
              <Input
                id="acc-no"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                placeholder="0123456789"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Nama Pemilik Rekening</Label>
              <Input
                id="acc-name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
                placeholder="Budi Santoso"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nominal">Nominal Penarikan</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">Rp</span>
                <Input
                  id="nominal"
                  className="pl-9"
                  inputMode="numeric"
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value.replace(/[^0-9]/g, ""))}
                  required
                  placeholder="100000"
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Cairkan Dana Sekarang
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Export & Tools */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download size={16} />
            Ekspor & Kelola Data
          </CardTitle>
          <CardDescription>Unduh data transaksi dan kelola sistem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          {/* CSV */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">Ekspor CSV</p>
              <p className="text-xs text-muted-foreground">Unduh semua transaksi (Excel-friendly).</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <FileSpreadsheet size={13} className="mr-2" />
              Unduh CSV
            </Button>
          </div>
          <Separator />
          {/* JSON */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">Ekspor JSON</p>
              <p className="text-xs text-muted-foreground">Cadangan data mentah.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportJson}>
              <FileJson size={13} className="mr-2" />
              Unduh JSON
            </Button>
          </div>
          <Separator />
          {/* PDF */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">Cetak / PDF</p>
              <p className="text-xs text-muted-foreground">Buka tampilan cetak lalu Simpan sebagai PDF.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handlePrintPdf}>
              <Printer size={13} className="mr-2" />
              Buka PDF
            </Button>
          </div>
          <Separator />
          {/* Reset */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold text-destructive">Reset Data</p>
              <p className="text-xs text-muted-foreground">Hapus semua transaksi merchant ini.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleReset} disabled={resetting}>
              {resetting ? (
                <><Loader2 size={13} className="mr-2 animate-spin" />Mereset...</>
              ) : (
                <><RotateCcw size={13} className="mr-2" />Reset</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
