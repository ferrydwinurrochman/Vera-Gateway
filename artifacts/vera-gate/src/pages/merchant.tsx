import React, { useState } from "react";
import {
  useListMerchants, getListMerchantsQueryKey, useCreateMerchant, useUpdateMerchant, useDeleteMerchant,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Store, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

export function Merchant() {
  const queryClient = useQueryClient();
  const { data: merchants, isLoading } = useListMerchants({ query: { queryKey: getListMerchantsQueryKey() } });
  const createMutation = useCreateMerchant();
  const updateMutation = useUpdateMerchant();
  const deleteMutation = useDeleteMerchant();

  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", code: "", callbackUrl: "", isActive: true });
  const [flash, setFlash] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

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
        setFlash({ msg: "Merchant berhasil diperbarui.", type: "ok" });
        queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() });
      },
      onError: (err: any) => setFlash({ msg: err?.error?.error || "Gagal memperbarui.", type: "err" }),
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Hapus merchant "${name}"?`)) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        setFlash({ msg: "Merchant dihapus.", type: "ok" });
        queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() });
      },
      onError: (err: any) => setFlash({ msg: err?.error?.error || "Gagal menghapus.", type: "err" }),
    });
  };

  const openEdit = (m: any) => {
    setEditId(m.id);
    setForm({ name: m.name, code: m.code, callbackUrl: m.callbackUrl || "", isActive: m.isActive });
    setCreating(false);
  };

  const cancelForm = () => { setCreating(false); setEditId(null); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Merchant</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tambah & kelola merchant yang terdaftar di gateway.</p>
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

      {/* Form */}
      {(creating || editId) && (
        <Card className="shadow-none border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Store size={15} />
              {creating ? "Tambah Merchant Baru" : "Edit Merchant"}
            </CardTitle>
            <CardDescription>
              {creating ? "Isi detail merchant baru." : "Perbarui informasi merchant."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={creating ? handleCreate : handleUpdate} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="m-name">Nama Merchant</Label>
                  <Input
                    id="m-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Nama merchant"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-code">Kode Internal</Label>
                  <Input
                    id="m-code"
                    className="font-mono"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                    required
                    placeholder="KODE_UNIK"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-cb">Callback URL (Opsional)</Label>
                <Input
                  id="m-cb"
                  type="url"
                  className="font-mono"
                  value={form.callbackUrl}
                  onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })}
                  placeholder="https://merchant.com/api/callback"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="m-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <Label htmlFor="m-active" className="cursor-pointer font-normal">
                  Status Aktif
                </Label>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 size={13} className="mr-2 animate-spin" />
                  )}
                  {creating ? "Tambah Merchant" : "Simpan Perubahan"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={cancelForm}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs">Kode</TableHead>
                <TableHead className="text-xs">Nama</TableHead>
                <TableHead className="text-xs">Callback URL</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : !merchants || merchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                    <Store size={32} className="mx-auto mb-2 opacity-30" />
                    Belum ada merchant terdaftar.
                  </TableCell>
                </TableRow>
              ) : merchants.map((m: any) => (
                <TableRow key={m.id} className="text-sm">
                  <TableCell className="font-mono font-bold text-xs">{m.code}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-48 truncate font-mono">
                    {m.callbackUrl || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${m.isActive ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-muted text-muted-foreground"}`}
                    >
                      {m.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEdit(m)}>
                        <Edit2 size={11} className="mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(m.id, m.name)}>
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
    </div>
  );
}
