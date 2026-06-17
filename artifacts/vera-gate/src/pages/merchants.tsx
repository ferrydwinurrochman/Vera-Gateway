import React, { useState } from "react";
import {
  useListMerchants,
  getListMerchantsQueryKey,
  useCreateMerchant,
  useUpdateMerchant,
  useDeleteMerchant,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Store, Check, X, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function Merchants() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", code: "", callbackUrl: "", isActive: true });

  const queryClient = useQueryClient();

  const { data: merchants, isLoading } = useListMerchants({
    query: { queryKey: getListMerchantsQueryKey() },
  });

  const createMutation = useCreateMerchant();
  const updateMutation = useUpdateMerchant();
  const deleteMutation = useDeleteMerchant();

  const handleOpenCreate = () => {
    setFormData({ name: "", code: "", callbackUrl: "", isActive: true });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (merchant: any) => {
    setSelectedMerchant(merchant);
    setFormData({ name: merchant.name, code: merchant.code, callbackUrl: merchant.callbackUrl || "", isActive: merchant.isActive });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (merchant: any) => {
    setSelectedMerchant(merchant);
    setIsDeleteOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: formData },
      {
        onSuccess: () => { setIsCreateOpen(false); queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() }); },
        onError: (err) => alert((err as any).error?.error || "Gagal menambahkan"),
      }
    );
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;
    updateMutation.mutate(
      { id: selectedMerchant.id, data: formData },
      {
        onSuccess: () => { setIsEditOpen(false); queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() }); },
        onError: (err) => alert((err as any).error?.error || "Gagal memperbarui"),
      }
    );
  };

  const handleDelete = () => {
    if (!selectedMerchant) return;
    deleteMutation.mutate(
      { id: selectedMerchant.id },
      {
        onSuccess: () => { setIsDeleteOpen(false); queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() }); },
        onError: (err) => alert((err as any).error?.error || "Gagal menghapus"),
      }
    );
  };

  const MerchantForm = ({ onSubmit, isPending, label }: any) => (
    <form onSubmit={onSubmit}>
      <div className="field">
        <label>Nama Merchant</label>
        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      </div>
      <div className="field">
        <label>Kode Merchant (Unik)</label>
        <input
          type="text"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, "") })}
          className="mono"
          required
        />
      </div>
      <div className="field">
        <label>Callback URL (Opsional)</label>
        <input type="url" value={formData.callbackUrl} onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })} placeholder="https://merchant.com/api/callback" />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Label htmlFor="isActive" style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Status Aktif</Label>
        <Switch id="isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {label}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p className="muted" style={{ fontSize: 13 }}>Kelola entitas bisnis yang menggunakan gateway</p>
        <button className="btn sm" onClick={handleOpenCreate} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Plus style={{ width: 15, height: 15 }} />
          Tambah Merchant
        </button>
      </div>

      {/* Table */}
      <div className="tablecard">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Callback URL</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="empty">Memuat data merchant...</td></tr>
              ) : merchants && merchants.length > 0 ? (
                merchants.map((merchant) => (
                  <tr key={merchant.id}>
                    <td className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{merchant.code}</td>
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                        <Store style={{ width: 15, height: 15, color: "var(--muted)" }} />
                        {merchant.name}
                      </div>
                    </td>
                    <td className="muted" style={{ fontSize: 12, maxWidth: 200 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
                        {merchant.callbackUrl || "-"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {merchant.isActive ? (
                        <span className="badge aktif"><Check style={{ width: 11, height: 11, display: "inline", marginRight: 4 }} />Aktif</span>
                      ) : (
                        <span className="badge nonaktif"><X style={{ width: 11, height: 11, display: "inline", marginRight: 4 }} />Nonaktif</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }} className="act">
                      <button className="abtn" onClick={() => handleOpenEdit(merchant)}>
                        <Edit2 style={{ width: 11, height: 11 }} /> Edit
                      </button>
                      <button className="abtn del" onClick={() => handleOpenDelete(merchant)}>
                        <Trash2 style={{ width: 11, height: 11 }} /> Hapus
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="empty">Belum ada merchant terdaftar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Merchant Baru</DialogTitle>
            <DialogDescription>Daftarkan entitas bisnis baru.</DialogDescription>
          </DialogHeader>
          <MerchantForm onSubmit={handleCreate} isPending={createMutation.isPending} label="Daftarkan" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Merchant</DialogTitle>
            <DialogDescription>Perbarui data untuk {selectedMerchant?.name}.</DialogDescription>
          </DialogHeader>
          <MerchantForm onSubmit={handleUpdate} isPending={updateMutation.isPending} label="Simpan Perubahan" />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--red)", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle style={{ width: 20, height: 20 }} />
              Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus merchant <strong>{selectedMerchant?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter style={{ marginTop: 8 }}>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
