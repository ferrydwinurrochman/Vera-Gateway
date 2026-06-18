import React, { useState } from "react";
import {
  useListMerchants, getListMerchantsQueryKey, useCreateMerchant, useUpdateMerchant, useDeleteMerchant,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Code2, Plus, Edit2, Trash2, Store, Loader2, Key, Terminal, AlertTriangle, X, Copy, Check,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const DEV_TOKEN = import.meta.env.VITE_DEV_TOKEN || "";

export function Developer() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const queryClient = useQueryClient();
  const { data: merchants, isLoading } = useListMerchants({
    query: { queryKey: getListMerchantsQueryKey(), enabled: authed },
  });
  const createMutation = useCreateMerchant();
  const updateMutation = useUpdateMerchant();
  const deleteMutation = useDeleteMerchant();

  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", code: "", callbackUrl: "", isActive: true });
  const [flash, setFlash] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<number | null>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!DEV_TOKEN || token === DEV_TOKEN) {
      setAuthed(true);
      setTokenError("");
    } else {
      setTokenError("Token tidak valid.");
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: form }, {
      onSuccess: () => {
        setCreating(false);
        setForm({ name: "", code: "", callbackUrl: "", isActive: true });
        setFlash({ msg: "Merchant berhasil ditambahkan.", type: "ok" });
        queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() });
      },
      onError: (err: any) => setFlash({ msg: err?.error?.error || "Gagal menambahkan.", type: "err" }),
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    updateMutation.mutate({ id: editId, data: form }, {
      onSuccess: () => {
        setEditId(null);
        setFlash({ msg: "Merchant diperbarui.", type: "ok" });
        queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() });
      },
      onError: (err: any) => setFlash({ msg: err?.error?.error || "Gagal memperbarui.", type: "err" }),
    });
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteMutation.mutate({ id: deleteConfirm.id }, {
      onSuccess: () => {
        setDeleteConfirm(null);
        setFlash({ msg: "Merchant dihapus.", type: "ok" });
        queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() });
      },
      onError: (err: any) => setFlash({ msg: err?.error?.error || "Gagal menghapus.", type: "err" }),
    });
  };

  const copyApiKey = (m: any) => {
    const key = m.apiKey || m.code;
    navigator.clipboard?.writeText(key).then(() => {
      setCopiedKey(m.id);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const openEdit = (m: any) => {
    setEditId(m.id);
    setForm({ name: m.name, code: m.code, callbackUrl: m.callbackUrl || "", isActive: m.isActive });
    setCreating(false);
  };

  const cancelForm = () => { setCreating(false); setEditId(null); };

  /* ---- DEV TOKEN GATE ---- */
  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-sm shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                <Terminal size={16} className="text-yellow-600" />
              </div>
              <CardTitle className="text-base">Developer Panel</CardTitle>
            </div>
            <CardDescription>Panel ini dilindungi token developer. Masukkan DEV_TOKEN untuk melanjutkan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="dev-token">DEV_TOKEN</Label>
                <Input
                  id="dev-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="••••••••••••••"
                  className="font-mono"
                  autoFocus
                />
              </div>
              {tokenError && (
                <p className="text-xs text-destructive">{tokenError}</p>
              )}
              <Button type="submit" className="w-full">Masuk Developer Panel</Button>
            </form>
            {!DEV_TOKEN && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Set env var <code className="font-mono bg-muted px-1 rounded">VITE_DEV_TOKEN</code> untuk mengaktifkan proteksi.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- MAIN DEVELOPER PANEL ---- */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Developer Panel</h1>
            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              DEV
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manajemen semua merchant & konfigurasi sistem.</p>
        </div>
        {!creating && !editId && (
          <Button size="sm" onClick={() => { setCreating(true); setForm({ name: "", code: "", callbackUrl: "", isActive: true }); }}>
            <Plus size={14} className="mr-2" />
            Tambah Merchant
          </Button>
        )}
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

      {/* API Endpoints Reference */}
      <Card className="shadow-none bg-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Code2 size={14} />
            API Quick Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              ["POST", `${BASE}/api/auth/login`],
              ["GET", `${BASE}/api/auth/me`],
              ["GET", `${BASE}/api/transactions`],
              ["POST", `${BASE}/api/transactions/generate`],
              ["GET", `${BASE}/api/merchants`],
              ["POST", `${BASE}/api/transactions/callback`],
            ].map(([method, endpoint]) => (
              <div key={endpoint} className="flex items-center gap-2 font-mono text-xs">
                <Badge variant="outline" className={`text-xs flex-shrink-0 ${method === "POST" ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}`}>
                  {method}
                </Badge>
                <span className="text-muted-foreground truncate">{endpoint}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Merchant Form */}
      {(creating || editId) && (
        <Card className="shadow-none border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Store size={15} />
              {creating ? "Tambah Merchant Baru" : "Edit Merchant"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={creating ? handleCreate : handleUpdate} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nama Merchant</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nama merchant" />
                </div>
                <div className="space-y-1.5">
                  <Label>Kode Internal</Label>
                  <Input className="font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })} required placeholder="KODE_UNIK" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Callback URL (Opsional)</Label>
                <Input type="url" className="font-mono" value={form.callbackUrl} onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })} placeholder="https://merchant.com/api/callback" />
              </div>
              <div className="flex items-center gap-3">
                <Switch id="dev-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label htmlFor="dev-active" className="cursor-pointer font-normal">Status Aktif</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={13} className="mr-2 animate-spin" />}
                  {creating ? "Tambah" : "Simpan"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={cancelForm}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Merchant Table */}
      <Card className="shadow-none overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-4 border-b border-border">
          <CardTitle className="text-sm pb-3">Semua Merchant</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs">ID</TableHead>
                <TableHead className="text-xs">Kode</TableHead>
                <TableHead className="text-xs">Nama</TableHead>
                <TableHead className="text-xs">Callback URL</TableHead>
                <TableHead className="text-xs">API Key</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : !merchants || merchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    Belum ada merchant.
                  </TableCell>
                </TableRow>
              ) : merchants.map((m: any) => (
                <TableRow key={m.id} className="text-sm">
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.id}</TableCell>
                  <TableCell className="font-mono font-bold text-xs">{m.code}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-40 truncate font-mono">
                    {m.callbackUrl || "—"}
                  </TableCell>
                  <TableCell>
                    {m.apiKey ? (
                      <Button variant="ghost" size="sm" className="h-7 px-2 font-mono text-xs gap-1" onClick={() => copyApiKey(m)}>
                        <Key size={10} />
                        {copiedKey === m.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                        {m.apiKey.slice(0, 12)}…
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${m.isActive ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-muted text-muted-foreground"}`}>
                      {m.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEdit(m)}>
                        <Edit2 size={11} className="mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteConfirm({ id: m.id, name: m.name })}>
                        <Trash2 size={11} className="mr-1" /> Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={18} />
              Hapus Merchant
            </DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus merchant <strong>{deleteConfirm?.name}</strong>? Semua data terkait akan ikut terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
