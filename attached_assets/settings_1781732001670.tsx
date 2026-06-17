import React, { useState, useEffect } from "react";
import {
  useGetSettings,
  getGetSettingsQueryKey,
  useUpdateSettings,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Settings2, Loader2, Save, ShieldAlert } from "lucide-react";

export function Settings() {
  const { toast } = useToast();
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

    if (formData.flypaySecret) {
      payload.flypaySecret = formData.flypaySecret;
    }

    updateMutation.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast({ title: "Konfigurasi berhasil disimpan" });
          setFormData((prev) => ({ ...prev, flypaySecret: "" }));
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        },
        onError: (err) => {
          toast({
            title: "Gagal menyimpan",
            description: (err as any).error?.error || "Terjadi kesalahan",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Warning */}
      <div
        className="flex items-start gap-3 p-4 rounded-lg"
        style={{
          backgroundColor: "rgba(234,179,8,0.1)",
          border: "1px solid rgba(234,179,8,0.2)",
        }}
      >
        <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#facc15" }} />
        <div>
          <p className="font-bold text-sm" style={{ color: "#facc15" }}>
            Konfigurasi Penting
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Perubahan pada halaman ini akan mempengaruhi semua transaksi yang berjalan. Pastikan kredensial Flypay sesuai environment.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Flypay Config */}
        <div className="vera-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-5 h-5" style={{ color: "var(--primary)" }} />
            <h3 className="font-bold">Konfigurasi Flypay Provider</h3>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
            Koneksi ke Flypay untuk generate QRIS
          </p>

          <div className="space-y-4">
            {/* Mode selector */}
            <div>
              <label className="vera-label">Mode Operasi</label>
              <select
                value={formData.flypayMode}
                onChange={(e) => setFormData({ ...formData, flypayMode: e.target.value as any })}
                className="vera-input font-bold"
                style={{
                  color: formData.flypayMode === "live" ? "#f87171" : "#60a5fa",
                  borderColor: formData.flypayMode === "live" ? "rgba(239,68,68,0.5)" : "rgba(0,102,204,0.5)",
                }}
              >
                <option value="sandbox">SANDBOX (TESTING)</option>
                <option value="live">LIVE (PRODUCTION)</option>
              </select>
              {formData.flypayMode === "live" && (
                <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>
                  ⚠ Mode LIVE aktif — transaksi sungguhan akan diproses
                </p>
              )}
            </div>

            <div>
              <label className="vera-label">Application ID</label>
              <input
                type="text"
                value={formData.flypayAppId}
                onChange={(e) => setFormData({ ...formData, flypayAppId: e.target.value })}
                className="vera-input font-mono"
                required
              />
            </div>

            <div>
              <label className="vera-label">Secret Key (kosongkan jika tidak diubah)</label>
              <input
                type="password"
                value={formData.flypaySecret}
                onChange={(e) => setFormData({ ...formData, flypaySecret: e.target.value })}
                className="vera-input font-mono"
                placeholder="••••••••••••••••••••••••"
              />
            </div>
          </div>
        </div>

        {/* Platform Config */}
        <div className="vera-card p-5">
          <h3 className="font-bold mb-1">Konfigurasi Platform</h3>
          <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
            Parameter routing dan pembatasan gateway
          </p>

          <div className="space-y-4">
            <div>
              <label className="vera-label">Base Callback URL</label>
              <input
                type="url"
                value={formData.callbackBaseUrl}
                onChange={(e) => setFormData({ ...formData, callbackBaseUrl: e.target.value })}
                className="vera-input font-mono"
                placeholder="https://your-domain.com"
                required
              />
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Target untuk webhook masuk dari Flypay
              </p>
            </div>

            <div>
              <label className="vera-label">Cooldown Anti-Spam (Menit)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={formData.cooldownMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) || 20 })
                }
                className="vera-input font-mono"
                required
              />
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                Waktu tunggu sebelum customer yang sama bisa generate QRIS baru saat masih MENUNGGU
              </p>
            </div>
          </div>

          {/* Submit */}
          <div
            className="mt-5 pt-4 flex justify-end"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              type="submit"
              className="btn-primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Konfigurasi
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
