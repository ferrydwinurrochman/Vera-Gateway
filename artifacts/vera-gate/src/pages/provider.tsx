import React, { useState, useEffect } from "react";
import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const CHANNELS = ["QRIS", "BCA", "BRI", "BNI", "MANDIRI", "DANA", "OVO", "GOPAY", "SHOPEEPAY"];

export function Provider() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateMutation = useUpdateSettings();

  const [form, setForm] = useState({
    flypayAppId: "",
    flypaySecret: "",
    flypayMode: "sandbox" as "sandbox" | "live",
    callbackBaseUrl: "",
    cooldownMinutes: 20,
    defaultChannel: "QRIS",
  });
  const [flash, setFlash] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(prev => ({
        ...prev,
        flypayAppId: settings.flypayAppId || "",
        flypayMode: (settings.flypayMode as any) || "sandbox",
        callbackBaseUrl: settings.callbackBaseUrl || "",
        cooldownMinutes: settings.cooldownMinutes || 20,
      }));
    }
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      flypayAppId: form.flypayAppId,
      flypayMode: form.flypayMode,
      callbackBaseUrl: form.callbackBaseUrl,
      cooldownMinutes: Number(form.cooldownMinutes),
    };
    if (form.flypaySecret) payload.flypaySecret = form.flypaySecret;
    updateMutation.mutate({ data: payload }, {
      onSuccess: () => {
        setFlash({ msg: "Pengaturan provider tersimpan.", type: "ok" });
        setForm(prev => ({ ...prev, flypaySecret: "" }));
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: (err: any) => setFlash({ msg: err?.error?.error || "Gagal menyimpan.", type: "err" }),
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFlash(null);
    await new Promise(r => setTimeout(r, 1000));
    setFlash({
      msg: form.flypayMode === "live"
        ? "Mode LIVE aktif. Pastikan App ID & Secret Key benar, dan whitelist IP server di dashboard Flypay."
        : "Mode SANDBOX aktif. Koneksi ke Flypay tidak dites dalam mode sandbox.",
      type: "ok"
    });
    setTesting(false);
  };

  const callbackUrl = form.callbackBaseUrl
    ? `${form.callbackBaseUrl}/api/transactions/callback`
    : "(isi Base Callback URL dulu)";

  if (isLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--muted)" }}>Memuat...</div>;
  }

  return (
    <>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Pengaturan Provider — Flypay</div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
        Kredensial API Flypay & konfigurasi mode operasi.
      </div>

      {flash && <div className={`flash ${flash.type}`} style={{ marginBottom: 14 }}>{flash.msg}</div>}

      <div className="tablecard" style={{ padding: 22, maxWidth: 680, marginBottom: 16 }}>
        <form onSubmit={handleSave}>
          <div className="field">
            <label>Channel Deposit Default</label>
            <select value={form.defaultChannel} onChange={e => setForm({ ...form, defaultChannel: e.target.value })}>
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <small style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, display: "block" }}>
              Pilih <b>QRIS</b> sebagai default (mendukung semua e-wallet & m-banking).
            </small>
          </div>

          <div className="field">
            <label>Application ID</label>
            <input
              type="text"
              className="mono"
              value={form.flypayAppId}
              onChange={e => setForm({ ...form, flypayAppId: e.target.value })}
              required
              placeholder="App ID dari Flypay"
            />
          </div>

          <div className="field">
            <label>Secret Key <small style={{ fontWeight: 400, color: "var(--muted)" }}>(kosongkan jika tidak diubah)</small></label>
            <input
              type="password"
              className="mono"
              value={form.flypaySecret}
              onChange={e => setForm({ ...form, flypaySecret: e.target.value })}
              placeholder="••••••••••••••••••••••••"
            />
          </div>

          <div className="field">
            <label>Base Callback URL</label>
            <input
              type="url"
              className="mono"
              value={form.callbackBaseUrl}
              onChange={e => setForm({ ...form, callbackBaseUrl: e.target.value })}
              placeholder="https://domain-kamu.com"
            />
            <small style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, display: "block" }}>
              Target webhook dari Flypay.
            </small>
          </div>

          <div className="field">
            <label>Cooldown Anti-Spam (Menit)</label>
            <input
              type="number"
              min="1"
              max="60"
              className="mono"
              value={form.cooldownMinutes}
              onChange={e => setForm({ ...form, cooldownMinutes: parseInt(e.target.value) || 20 })}
              required
            />
            <small style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, display: "block" }}>
              Waktu tunggu sebelum customer yang sama bisa generate QRIS baru saat masih MENUNGGU.
            </small>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, margin: "12px 0 16px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.flypayMode === "live"}
              onChange={e => setForm({ ...form, flypayMode: e.target.checked ? "live" : "sandbox" })}
              style={{ width: 18, height: 18 }}
            />
            Mode LIVE <span style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)" }}>
              (Aktif = Pakai Flypay | Mati = Mode Sandbox)
            </span>
          </label>
          {form.flypayMode === "live" && (
            <div className="flash err" style={{ marginBottom: 14 }}>⚠ Mode LIVE aktif — transaksi sungguhan akan diproses</div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" type="submit" name="simpan_provider" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
            <button className="btn alt" type="button" onClick={handleTestConnection} disabled={testing}>
              {testing ? "Mengetes..." : "Tes Koneksi ke Flypay"}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 18, borderTop: "1px dashed var(--line)", paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
            URL Webhook / Callback
          </div>
          <div className="mono" style={{ fontSize: 12, background: "var(--blue-50)", color: "var(--blue)", padding: "10px 12px", borderRadius: 10, wordBreak: "break-all" }}>
            {callbackUrl}
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            Pastikan URL ini sudah kamu daftarkan ke dashboard Flypay agar status deposit/withdraw berubah otomatis.
          </p>
        </div>
      </div>
    </>
  );
}
