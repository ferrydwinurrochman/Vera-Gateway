import React, { useState } from "react";
import {
  useGenerateTransaction,
  useGetTransaction,
  getGetTransactionQueryKey,
  useUpdateTransactionStatus,
} from "@workspace/api-client-react";
import { formatRupiah } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QrCode, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function Topup() {
  const [amount, setAmount] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [activeTxId, setActiveTxId] = useState<number | null>(null);
  const [cooldownError, setCooldownError] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateMutation = useGenerateTransaction();
  const updateStatusMutation = useUpdateTransactionStatus();

  const { data: activeTx } = useGetTransaction(activeTxId!, {
    query: {
      enabled: !!activeTxId,
      refetchInterval: 5000,
      queryKey: getGetTransactionQueryKey(activeTxId!),
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCooldownError(null);

    const numAmount = parseInt(amount.replace(/[^0-9]/g, ""));
    if (!numAmount || numAmount < 1000) {
      toast({
        title: "Nominal Tidak Valid",
        description: "Nominal minimal Rp 1.000",
        variant: "destructive",
      });
      return;
    }

    if (!customerId) {
      toast({
        title: "Customer ID Diperlukan",
        description: "Masukkan Customer ID",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate(
      { data: { amount: numAmount, customerId } },
      {
        onSuccess: (data) => {
          setActiveTxId(data.transaction.id);
          toast({ title: "QRIS berhasil dibuat", description: "Scan QR untuk menyelesaikan pembayaran." });
        },
        onError: (error: any) => {
          if (error?.status === 409 && error?.error?.cooldownMinutes) {
            setCooldownError(error.error);
          } else {
            toast({
              title: "Gagal Membuat QRIS",
              description: error?.error?.error || "Terjadi kesalahan",
              variant: "destructive",
            });
          }
        },
      }
    );
  };

  const handleCancel = () => {
    if (activeTxId) {
      updateStatusMutation.mutate(
        { id: activeTxId, data: { status: "GAGAL", notes: "Dibatalkan oleh pengguna" } },
        {
          onSuccess: () => {
            setActiveTxId(null);
            setAmount("");
            setCustomerId("");
            toast({ title: "Transaksi dibatalkan" });
            queryClient.invalidateQueries({ queryKey: getGetTransactionQueryKey(activeTxId) });
          },
        }
      );
    }
  };

  const handleNew = () => {
    setActiveTxId(null);
    setAmount("");
    setCustomerId("");
    setCooldownError(null);
  };

  // Payment success
  if (activeTx && activeTx.status === "SUKSES") {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div
          className="vera-card p-8 text-center"
          style={{ borderColor: "rgba(74,222,128,0.3)" }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "rgba(74,222,128,0.15)" }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: "#4ade80" }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "#4ade80" }}>
            PEMBAYARAN SUKSES
          </h2>
          <p className="text-3xl font-mono font-bold mb-1">
            {formatRupiah(activeTx.amount)}
          </p>
          <p className="text-xs font-mono mb-6" style={{ color: "var(--muted-foreground)" }}>
            REF: {activeTx.ref}
          </p>
          <button className="btn-primary w-full" onClick={handleNew}>
            Generate QRIS Baru
          </button>
        </div>
      </div>
    );
  }

  // QR code display
  if (activeTxId && activeTx && activeTx.qrCode) {
    return (
      <div className="max-w-md mx-auto">
        <div className="vera-card overflow-hidden" style={{ borderColor: "rgba(0,102,204,0.3)" }}>
          <div
            className="p-4 text-center"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <h2
              className="font-bold text-lg tracking-widest"
              style={{ color: "var(--primary-foreground)" }}
            >
              SCAN TO PAY
            </h2>
            <p
              className="text-sm mt-1 font-mono"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              {formatRupiah(activeTx.amount)}
            </p>
          </div>

          <div className="p-6 flex flex-col items-center">
            <div
              className="bg-white p-4 rounded-xl w-full flex items-center justify-center"
              style={{ maxHeight: "50vh", aspectRatio: "1" }}
            >
              <img
                src={activeTx.qrCode}
                alt="QRIS Code"
                className="w-full h-full object-contain mix-blend-multiply"
              />
            </div>

            <div className="mt-5 w-full space-y-3 text-center">
              <p
                className="font-mono text-lg font-bold py-2 rounded"
                style={{
                  backgroundColor: "var(--muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {formatRupiah(activeTx.amount)}
              </p>
              <p className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
                REF: {activeTx.ref}
              </p>

              <div
                className="text-xs p-3 rounded font-bold tracking-wide"
                style={{
                  backgroundColor: "rgba(234,179,8,0.1)",
                  border: "1px solid rgba(234,179,8,0.2)",
                  color: "#facc15",
                }}
              >
                QRIS SEKALI PAKAI, KE MENU TOPUP LAGI UNTUK TOPUP SELANJUTNYA
              </div>

              <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--primary)" }} />
                Menunggu pembayaran...
              </div>

              <button
                className="btn-danger w-full"
                onClick={handleCancel}
                disabled={updateStatusMutation.isPending}
              >
                Batalkan Transaksi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Cooldown error */}
      {cooldownError && (
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: "var(--destructive)" }} />
            <span className="font-bold text-sm" style={{ color: "var(--destructive)" }}>
              Transaksi Aktif Ditemukan
            </span>
          </div>
          <p className="text-sm mb-2" style={{ color: "var(--foreground)" }}>
            {cooldownError.error}
          </p>
          <div
            className="text-xs font-mono p-2 rounded"
            style={{ backgroundColor: "var(--background)" }}
          >
            <div>REF: {cooldownError.existingRef}</div>
            <div>Sisa waktu: {cooldownError.remainingMinutes} menit</div>
          </div>
        </div>
      )}

      {/* Form card */}
      <div className="vera-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-5 h-5" style={{ color: "var(--primary)" }} />
          <h3 className="font-bold text-lg">Transaksi Baru</h3>
        </div>
        <p className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>
          Isi detail untuk generate QRIS
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="vera-label">Customer ID / Akun</label>
            <input
              type="text"
              placeholder="CUST-12345"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="vera-input font-mono text-base"
              required
            />
          </div>

          <div>
            <label className="vera-label">Nominal (IDR)</label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Rp
              </span>
              <input
                type="text"
                placeholder="50.000"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setAmount(val ? parseInt(val).toLocaleString("id-ID") : "");
                }}
                className="vera-input pl-10 text-xl font-mono font-bold"
                style={{ height: "52px" }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            style={{ height: "48px", fontSize: "14px" }}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                Generate QRIS
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
