import React, { useState } from "react";
import { useGenerateTransaction } from "@workspace/api-client-react";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ExternalLink, Loader2, Link2 } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);

  const generateMutation = useGenerateTransaction();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numAmount = parseInt(nominal.replace(/[^0-9]/g, ""));
    if (!username.trim()) { setError("Isi username customer dulu."); return; }
    if (!numAmount || numAmount < 1000) { setError("Nominal minimal Rp 1.000"); return; }

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
          setError(err?.error?.error || "Gagal membuat link pembayaran.");
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

  const numericAmount = parseInt(nominal.replace(/[^0-9]/g, "")) || 0;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Payment Link / QRIS</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Buat tagihan untuk customer, lalu bagikan link-nya.
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 size={16} />
            Buat Link Pembayaran
          </CardTitle>
          <CardDescription>Isi detail tagihan dan generate link pembayaran.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pl-username">Username Customer</Label>
              <Input
                id="pl-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="cth: budi_santoso"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pl-nominal">Nominal</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  Rp
                </span>
                <Input
                  id="pl-nominal"
                  className="pl-9"
                  inputMode="numeric"
                  value={nominal}
                  onChange={(e) => setNominal(formatAmount(e.target.value))}
                  placeholder="50.000"
                  required
                />
              </div>
              {numericAmount >= 1000 && (
                <p className="text-xs text-muted-foreground">{formatRupiah(numericAmount)}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pl-channel">Channel Pembayaran</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger id="pl-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Membuat Link...
                </>
              ) : (
                "Buat Link Pembayaran"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {generatedLink && (
        <Card className="shadow-none border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Link Pembayaran Berhasil Dibuat</CardTitle>
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                Aktif
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="font-mono text-xs bg-card rounded-lg border border-border px-3 py-3 break-all select-all">
              {generatedLink}
            </div>
            {generatedRef && (
              <p className="text-xs text-muted-foreground">
                Ref: <span className="font-mono">{generatedRef}</span>
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button asChild variant="default" size="sm">
                <a href={generatedLink} target="_blank" rel="noreferrer">
                  <ExternalLink size={13} className="mr-1.5" />
                  Buka
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check size={13} className="mr-1.5 text-green-500" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy size={13} className="mr-1.5" />
                    Salin Link
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
