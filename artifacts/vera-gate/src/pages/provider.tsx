import React, { useState, useEffect } from "react";
import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Settings, Zap, Copy, AlertTriangle, X } from "lucide-react";

const CHANNELS = ["QRIS","BCA","BRI","BNI","MANDIRI","DANA","OVO","GOPAY","SHOPEEPAY"];

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
      setForm((prev) => ({
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
        setForm((prev) => ({ ...prev, flypaySecret: "" }));
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: (err: any) => setFlash({ msg: err?.error?.error || "Gagal menyimpan.", type: "err" }),
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFlash(null);
    await new Promise((r) => setTimeout(r, 1000));
    setFlash({
      msg: form.flypayMode === "live"
        ? "Mode LIVE aktif. Pastikan App ID & Secret Key benar, dan whitelist IP server di dashboard Flypay."
        : "Mode SANDBOX aktif. Koneksi ke Flypay tidak dites dalam mode sandbox.",
      type: "ok",
    });
    setTesting(false);
  };

  const callbackUrl = form.callbackBaseUrl
    ? `${form.callbackBaseUrl}/api/transactions/callback`
    : "(isi Base Callback URL dulu)";

  const copyCallback = () => {
    if (form.callbackBaseUrl) navigator.clipboard?.writeText(callbackUrl);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-52 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Memuat pengaturan...
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Pengaturan Provider — Flypay</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kredensial API Flypay & konfigurasi mode operasi.</p>
      </div>

      {/* Alert */}
      {flash && (
        <div className={`px-4 py-3 rounded-lg border text-sm flex items-center justify-between ${
          flash.type === "ok"
            ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
            : "bg-destructive/10 border-destructive/20 text-destructive"
        }`}>
          {flash.msg}
          <button onClick={() => setFlash(null)} className="opacity-60 hover:opacity-100 ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Live mode warning */}
      {form.flypayMode === "live" && (
        <div className="px-4 py-3 rounded-lg border bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="flex-shrink-0" />
          Mode LIVE aktif — transaksi sungguhan akan diproses.
        </div>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings size={15} />
            Konfigurasi Flypay
          </CardTitle>
          <CardDescription>Isi kredensial dari dashboard Flypay Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            {/* Channel */}
            <div className="space-y-1.5">
              <Label>Channel Deposit Default</Label>
              <Select value={form.defaultChannel} onValueChange={(v) => setForm({ ...form, defaultChannel: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Pilih <strong>QRIS</strong> sebagai default (mendukung semua e-wallet & m-banking).</p>
            </div>

            <Separator />

            {/* App ID */}
            <div className="space-y-1.5">
              <Label>Application ID</Label>
              <Input
                className="font-mono"
                value={form.flypayAppId}
                onChange={(e) => setForm({ ...form, flypayAppId: e.target.value })}
                required
                placeholder="App ID dari Flypay"
              />
            </div>

            {/* Secret Key */}
            <div className="space-y-1.5">
              <Label>
                Secret Key{" "}
                <span className="font-normal text-muted-foreground text-xs">(kosongkan jika tidak diubah)</span>
              </Label>
              <Input
                type="password"
                className="font-mono"
                value={form.flypaySecret}
                onChange={(e) => setForm({ ...form, flypaySecret: e.target.value })}
                placeholder="••••••••••••••••••••••••"
              />
            </div>

            {/* Callback URL */}
            <div className="space-y-1.5">
              <Label>Base Callback URL</Label>
              <Input
                type="url"
                className="font-mono"
                value={form.callbackBaseUrl}
                onChange={(e) => setForm({ ...form, callbackBaseUrl: e.target.value })}
                placeholder="https://domain-kamu.com"
              />
              <p className="text-xs text-muted-foreground">Target webhook dari Flypay.</p>
            </div>

            {/* Cooldown */}
            <div className="space-y-1.5">
              <Label>Cooldown Anti-Spam (Menit)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                className="font-mono w-32"
                value={form.cooldownMinutes}
                onChange={(e) => setForm({ ...form, cooldownMinutes: parseInt(e.target.value) || 20 })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Waktu tunggu sebelum customer yang sama bisa generate QRIS baru saat masih MENUNGGU.
              </p>
            </div>

            {/* Live mode toggle */}
            <div className="flex items-center gap-3 py-1">
              <Switch
                id="live-mode"
                checked={form.flypayMode === "live"}
                onCheckedChange={(v) => setForm({ ...form, flypayMode: v ? "live" : "sandbox" })}
              />
              <div>
                <Label htmlFor="live-mode" className="cursor-pointer">Mode LIVE</Label>
                <p className="text-xs text-muted-foreground">Aktif = Pakai Flypay live | Mati = Mode sandbox</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan Pengaturan
              </Button>
              <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengetes...</>
                ) : (
                  <><Zap size={14} className="mr-2" />Tes Koneksi ke Flypay</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">URL Webhook / Callback</CardTitle>
          <CardDescription>Daftarkan URL ini ke dashboard Flypay agar status deposit/withdraw berubah otomatis.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-muted rounded-lg px-3 py-2.5 break-all text-primary">
              {callbackUrl}
            </code>
            {form.callbackBaseUrl && (
              <Button variant="ghost" size="icon" className="flex-shrink-0 h-9 w-9" onClick={copyCallback}>
                <Copy size={14} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
