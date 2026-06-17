import React, { useState } from "react";
import {
  useGenerateTransaction,
  useGetTransaction,
  getGetTransactionQueryKey,
  useUpdateTransactionStatus,
} from "@workspace/api-client-react";
import { formatRupiah } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { QrCode, Loader2 } from "lucide-react";

export function Topup() {
  const [amount, setAmount] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [activeTxId, setActiveTxId] = useState<number | null>(null);
  const [cooldownError, setCooldownError] = useState<any>(null);

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
      alert("Nominal minimal Rp 1.000");
      return;
    }
    if (!customerId) {
      alert("Masukkan Customer ID");
      return;
    }

    generateMutation.mutate(
      { data: { amount: numAmount, customerId } },
      {
        onSuccess: (data) => {
          setActiveTxId(data.transaction.id);
        },
        onError: (error: any) => {
          if (error?.status === 409 && error?.error?.cooldownMinutes) {
            setCooldownError(error.error);
          } else {
            alert(error?.error?.error || "Gagal membuat QRIS");
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
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="success-box">
          <div className="ic">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>PEMBAYARAN SUKSES</div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 800 }}>{formatRupiah(activeTx.amount)}</div>
          <div className="mono muted" style={{ fontSize: 12, marginTop: 4 }}>REF: {activeTx.ref}</div>
        </div>
        <button className="btn" onClick={handleNew}>Generate QRIS Baru</button>
      </div>
    );
  }

  // QR code display
  if (activeTxId && activeTx && activeTx.qrCode) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="tablecard">
          <div style={{ background: "var(--navy)", padding: "14px 20px", textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: ".15em", color: "#fff" }}>SCAN TO PAY</div>
            <div className="mono" style={{ fontSize: 13, color: "rgba(255,255,255,.75)", marginTop: 4 }}>{formatRupiah(activeTx.amount)}</div>
          </div>
          <div style={{ padding: "20px 20px 8px" }}>
            <div className="qrwrap">
              <div className="qrbox">
                <img
                  src={activeTx.qrCode}
                  alt="QRIS Code"
                  style={{ width: "100%", maxWidth: 260, display: "block" }}
                />
              </div>
            </div>

            <div className="qrcap">
              <span className="k">Nominal</span>
              <span className="v mono">{formatRupiah(activeTx.amount)}</span>
            </div>
            <div className="qrcap">
              <span className="k">REF</span>
              <span className="v mono" style={{ fontSize: 12 }}>{activeTx.ref}</span>
            </div>

            <div className="timer" style={{ marginTop: 14 }}>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              Menunggu pembayaran...
            </div>

            <div style={{
              background: "var(--amber-bg)", color: "var(--amber)", borderRadius: 10,
              padding: "10px 14px", fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 14
            }}>
              QRIS SEKALI PAKAI — GENERATE BARU UNTUK TOPUP SELANJUTNYA
            </div>

            <button
              className="btn alt"
              onClick={handleCancel}
              disabled={updateStatusMutation.isPending}
              style={{ borderColor: "var(--red)", color: "var(--red)" }}
            >
              Batalkan Transaksi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      {cooldownError && (
        <div className="flash err" style={{ marginBottom: 16 }}>
          <strong>Transaksi Aktif Ditemukan</strong><br />
          {cooldownError.error}<br />
          <span className="mono" style={{ fontSize: 12 }}>REF: {cooldownError.existingRef} · Sisa: {cooldownError.remainingMinutes} menit</span>
        </div>
      )}

      <div className="tablecard" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <QrCode style={{ width: 20, height: 20, color: "var(--blue)" }} />
          <strong style={{ fontSize: 16 }}>Transaksi Baru</strong>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>Isi detail untuk generate QRIS</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Customer ID / Akun</label>
            <input
              type="text"
              placeholder="CUST-12345"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mono"
              required
            />
          </div>

          <div className="field">
            <label>Nominal (IDR)</label>
            <div className="ip-rp">
              <span className="pre">Rp</span>
              <input
                type="text"
                placeholder="50.000"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setAmount(val ? parseInt(val).toLocaleString("id-ID") : "");
                }}
                className="mono"
                style={{ fontSize: 20, fontWeight: 800 }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn"
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 style={{ width: 17, height: 17, animation: "spin 1s linear infinite" }} />
                Generating...
              </>
            ) : (
              <>
                <QrCode style={{ width: 17, height: 17 }} />
                Generate QRIS
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
