import React, { useState } from "react";
import { useGenerateTransaction } from "@workspace/api-client-react";
import { formatRupiah } from "@/lib/utils";

const CHANNELS = ["QRIS", "BCA", "BRI", "BNI", "MANDIRI", "DANA", "OVO", "GOPAY", "SHOPEEPAY"];

function formatAmount(raw: string): string {
  const n = raw.replace(/[^0-9]/g, "");
  if (!n) return "";
  return Number(n).toLocaleString("id-ID");
}

export function PaymentLink() {
  const [username, setUsername] = useState("");
  const [nominal, setNominal] = useState("");
  const [channel, setChannel] = useState("QRIS");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedRef, setGeneratedRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const generateMutation = useGenerateTransaction();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFlash(null);
    const numAmount = parseInt(nominal.replace(/[^0-9]/g, ""));
    if (!username.trim()) { setFlash({ msg: "Isi username dulu.", type: "err" }); return; }
    if (!numAmount || numAmount < 1000) { setFlash({ msg: "Nominal minimal Rp 1.000", type: "err" }); return; }

    generateMutation.mutate(
      { data: { amount: numAmount, customerId: username.trim(), notes: channel } },
      {
        onSuccess: (data) => {
          const base = window.location.origin;
          const link = `${base}/topup?ref=${data.transaction.ref}`;
          setGeneratedLink(link);
          setGeneratedRef(data.transaction.ref);
          setCopied(false);
        },
        onError: (err: any) => {
          const msg = err?.error?.error || "Gagal membuat link pembayaran.";
          setFlash({ msg, type: "err" });
        },
      }
    );
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard?.writeText(generatedLink).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Payment Link / QRIS</div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
        Buat tagihan untuk customer, lalu bagikan link-nya.
      </div>

      {flash && (
        <div className={`flash ${flash.type}`} style={{ marginBottom: 14 }}>{flash.msg}</div>
      )}

      <div className="tablecard" style={{ padding: 22, maxWidth: 540 }}>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Username Customer</label>
            <input
              name="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              placeholder="cth: budi_santoso"
            />
          </div>
          <div className="field">
            <label>Nominal</label>
            <div className="ip-rp">
              <span className="pre">Rp</span>
              <input
                name="nominal"
                inputMode="numeric"
                value={nominal}
                onChange={e => setNominal(formatAmount(e.target.value))}
                required
                placeholder="cth: 50.000"
              />
            </div>
          </div>
          <div className="field">
            <label>Channel</label>
            <select value={channel} onChange={e => setChannel(e.target.value)}>
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button className="btn" type="submit" disabled={generateMutation.isPending}>
            {generateMutation.isPending ? "Membuat..." : "Buat Link Pembayaran"}
          </button>
        </form>

        {generatedLink && (
          <div style={{ marginTop: 18, borderTop: "1px dashed var(--line)", paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
              Link Pembayaran
            </div>
            <div
              className="mono"
              id="pl-link"
              style={{ fontSize: 12, background: "var(--blue-50)", color: "var(--blue)", padding: "10px 12px", borderRadius: 10, wordBreak: "break-all" }}
            >
              {generatedLink}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
              Ref: <span className="mono">{generatedRef}</span>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <a className="btn sm" href={generatedLink} target="_blank" rel="noreferrer">Buka</a>
              <button className="btn sm alt" type="button" onClick={handleCopy}>
                {copied ? "Tersalin ✓" : "Salin Link"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
