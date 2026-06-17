import React, { useState, useEffect } from "react";
import {
  useGetSettings,
  getGetSettingsQueryKey,
  useUpdateSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Loader2 } from "lucide-react";

export function Settings() {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    flypayAppId: "",
    flypaySecret: "",
    flypayMode: "sandbox" as any,
    callbackBaseUrl: "",
    cooldownMinutes: 20,
  });

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  const updateMutation = useUpdateSettings();

  useEffect(() => {
    if (settings) {
      setFormData({
        flypayAppId: settings.flypayAppId || "",
        flypaySecret: "",
        flypayMode: settings.flypayMode || "sandbox",
        callbackBaseUrl: settings.callbackBaseUrl || "",
        cooldownMinutes: settings.cooldownMinutes || 20,
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      flypayAppId: formData.flypayAppId,
      flypayMode: formData.flypayMode,
      callbackBaseUrl: formData.callbackBaseUrl,
      cooldownMinutes: Number(formData.cooldownMinutes),
    };
    if (formData.flypaySecret) payload.flypaySecret = formData.flypaySecret;

    updateMutation.mutate(
      { data: payload },
      {
        onSuccess: () => {
          setFormData((prev) => ({ ...prev, flypaySecret: "" }));
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          alert("Konfigurasi berhasil disimpan");
        },
        onError: (err) => {
          alert((err as any).error?.error || "Gagal menyimpan konfigurasi");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite", color: "var(--blue)" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Warning */}
      <div className="flash" style={{ background: "var(--amber-bg)", color: "var(--amber)", marginBottom: 18 }}>
        ⚠ Perubahan pada halaman ini mempengaruhi semua transaksi yang berjalan. Pastikan kredensial Flypay sesuai environment.
      </div>

      <form onSubmit={handleSubmit}>
        {/* Flypay Config */}
        <div className="tablecard" style={{ padding: "20px 24px", marginBottom: 14 }}>
          <strong style={{ fontSize: 15, display: "block", marginBottom: 4 }}>Konfigurasi Flypay Provider</strong>
          <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>Koneksi ke Flypay untuk generate QRIS</p>

          <div className="field">
            <label>Mode Operasi</label>
            <select
              value={formData.flypayMode}
              onChange={(e) => setFormData({ ...formData, flypayMode: e.target.value as any })}
              style={{
                color: formData.flypayMode === "live" ? "var(--red)" : "var(--blue)",
                borderColor: formData.flypayMode === "live" ? "var(--red)" : "var(--line)",
                fontWeight: 700,
              }}
            >
              <option value="sandbox">SANDBOX (TESTING)</option>
              <option value="live">LIVE (PRODUCTION)</option>
            </select>
            {formData.flypayMode === "live" && (
              <small style={{ color: "var(--red)", fontSize: 12 }}>⚠ Mode LIVE aktif — transaksi sungguhan akan diproses</small>
            )}
          </div>

          <div className="field">
            <label>Application ID</label>
            <input
              type="text"
              value={formData.flypayAppId}
              onChange={(e) => setFormData({ ...formData, flypayAppId: e.target.value })}
              className="mono"
              required
            />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Secret Key (kosongkan jika tidak diubah)</label>
            <input
              type="password"
              value={formData.flypaySecret}
              onChange={(e) => setFormData({ ...formData, flypaySecret: e.target.value })}
              className="mono"
              placeholder="••••••••••••••••••••••••"
            />
          </div>
        </div>

        {/* Platform Config */}
        <div className="tablecard" style={{ padding: "20px 24px", marginBottom: 14 }}>
          <strong style={{ fontSize: 15, display: "block", marginBottom: 4 }}>Konfigurasi Platform</strong>
          <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>Parameter routing dan pembatasan gateway</p>

          <div className="field">
            <label>Base Callback URL</label>
            <input
              type="url"
              value={formData.callbackBaseUrl}
              onChange={(e) => setFormData({ ...formData, callbackBaseUrl: e.target.value })}
              className="mono"
              placeholder="https://your-domain.com"
              required
            />
            <small className="muted" style={{ fontSize: 12 }}>Target untuk webhook masuk dari Flypay</small>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Cooldown Anti-Spam (Menit)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={formData.cooldownMinutes}
              onChange={(e) => setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) || 20 })}
              className="mono"
              required
            />
            <small className="muted" style={{ fontSize: 12 }}>Waktu tunggu sebelum customer yang sama bisa generate QRIS baru saat masih MENUNGGU</small>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            className="btn sm"
            disabled={updateMutation.isPending}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            {updateMutation.isPending ? (
              <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Menyimpan...</>
            ) : (
              <><Save style={{ width: 15, height: 15 }} /> Simpan Konfigurasi</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
