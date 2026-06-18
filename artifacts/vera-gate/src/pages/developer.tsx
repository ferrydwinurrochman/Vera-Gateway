import React, { useState } from "react";
import {
  useListMerchants, getListMerchantsQueryKey, useCreateMerchant, useUpdateMerchant, useDeleteMerchant,
  useListUsers, getListUsersQueryKey,
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
  Code2, Plus, Edit2, Trash2, Store, Loader2, Key, Terminal, AlertTriangle, X, Copy, Check,
  Users as UsersIcon, TrendingUp, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const roleBadge: Record<string, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  operator: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  merchant: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export function Developer() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const queryClient = useQueryClient();

  const { data: merchants, isLoading: merchantsLoading } = useListMerchants({
    query: { queryKey: getListMerchantsQueryKey(), enabled: authed },
  });
  const { data: users, isLoading: usersLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey(), enabled: authed },
  });
  const { data: summary } = useGetDashboardSummary(
    { period: "today" },
    { query: { queryKey: getGetDashboardSummaryQueryKey({ period: "today" }), enabled: authed, refetchInterval: 30000 } }
  );

  const createMutation = useCreateMerchant();
  const updateMutation = useUpdateMerchant();
  const deleteMutation = useDeleteMerchant();

  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", code: "", callbackUrl: "", isActive: true });
  const [flash, setFlash] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<number | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError("");
    setVerifying(true);
    try {
      const res = await fetch(`${BASE}/api/dev/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setAuthed(true);
      } else {
        setTokenError(body.error || "Kode tidak valid atau sudah kedaluwarsa.");
      }
    } catch {
      setTokenError("Gagal menghubungi server. Coba lagi.");
    } finally {
      setVerifying(false);
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

  /* ---- TOTP GATE ---- */
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
            <CardDescription>Panel ini dilindungi TOTP. Masukkan kode 6 digit dari Google Authenticator.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="dev-token">Kode Authenticator</Label>
                <Input
                  id="dev-token"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit Authenticator Code"
                  className="font-mono tracking-widest text-center text-lg"
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>
              {tokenError && (
                <p className="text-xs text-destructive">{tokenError}</p>
              )}
              <Button type="submit" className="w-full" disabled={verifying || token.length !== 6}>
                {verifying ? <><Loader2 size={14} className="mr-2 animate-spin" />Memverifikasi...</> : "Masuk Developer Panel"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- derive stats ---- */
  const merchantCount = merchants?.length ?? 0;
  const activeMerchantCount = merchants?.filter((m: any) => m.isActive).length ?? 0;
  const userCount = users?.length ?? 0;
  const todayAmount = summary?.todayAmount ?? 0;
  const suksesCount = summary?.byStatus?.find((s: any) => s.status === "SUKSES")?.count ?? 0;

  /* ---- MAIN DEVELOPER PANEL ---- */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Developer Panel</h1>
            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              SUPER ADMIN
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Live data dari database MySQL — manajemen penuh semua merchant & user.</p>
        </div>
        {!creating && !editId && (
          <Button size="sm" onClick={() => { setCreating(true); setForm({ name: "", code: "", callbackUrl: "", isActive: true }); }}>
            <Plus size={14} className="mr-2" />
            Tambah Merchant
          </Button>
        )}
      </div>

      {/* Flash */}
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

      {/* System Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Merchant", value: merchantCount, sub: `${activeMerchantCount} aktif`, icon: Store, color: "text-primary", bg: "bg-primary/10" },
          { label: "Total User", value: userCount, sub: "terdaftar", icon: UsersIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Sukses Hari Ini", value: suksesCount, sub: "transaksi", icon: Activity, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Nominal Hari Ini", value: formatRupiah(todayAmount), sub: "total sukses", icon: TrendingUp, color: "text-yellow-600", bg: "bg-yellow-500/10", mono: true },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", stat.bg)}>
                  <stat.icon size={14} className={stat.color} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={cn("text-xl font-bold tracking-tight", stat.mono && "font-mono text-sm")}>{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Quick Reference */}
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

      {/* Merchants Table */}
      <Card className="shadow-none overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-sm pb-3 flex items-center gap-2">
            <Store size={13} className="text-muted-foreground" />
            Semua Merchant
            <Badge variant="outline" className="text-xs ml-1">{merchantCount}</Badge>
          </CardTitle>
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
              {merchantsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Memuat data merchant...
                  </TableCell>
                </TableRow>
              ) : !merchants || merchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    Belum ada merchant di database.
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

      {/* Users Table */}
      <Card className="shadow-none overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-4 border-b border-border">
          <CardTitle className="text-sm pb-3 flex items-center gap-2">
            <UsersIcon size={13} className="text-muted-foreground" />
            Semua User
            <Badge variant="outline" className="text-xs ml-1">{userCount}</Badge>
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs">ID</TableHead>
                <TableHead className="text-xs">Username</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Merchant</TableHead>
                <TableHead className="text-xs">Dibuat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Memuat data user...
                  </TableCell>
                </TableRow>
              ) : !users || users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                    Belum ada user di database.
                  </TableCell>
                </TableRow>
              ) : users.map((u: any) => (
                <TableRow key={u.id} className="text-sm">
                  <TableCell className="font-mono text-xs text-muted-foreground">{u.id}</TableCell>
                  <TableCell className="font-semibold">{u.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs capitalize ${roleBadge[u.role] ?? "bg-muted text-muted-foreground"}`}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.merchantId ? (
                      <span className="font-mono">#{u.merchantId}</span>
                    ) : (
                      <span className="italic">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {u.createdAt ? formatDate(u.createdAt) : "—"}
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
