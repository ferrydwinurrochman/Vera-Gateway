import React, { useState } from "react";
import {
  useListMerchants,
  getListMerchantsQueryKey,
  useCreateMerchant,
  useUpdateMerchant,
  useDeleteMerchant,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
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
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    callbackUrl: "",
    isActive: true,
  });

  const { toast } = useToast();
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
    setFormData({
      name: merchant.name,
      code: merchant.code,
      callbackUrl: merchant.callbackUrl || "",
      isActive: merchant.isActive,
    });
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
        onSuccess: () => {
          toast({ title: "Merchant berhasil ditambahkan" });
          setIsCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Error", description: (err as any).error?.error || "Gagal menambahkan", variant: "destructive" });
        },
      }
    );
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;
    updateMutation.mutate(
      { id: selectedMerchant.id, data: formData },
      {
        onSuccess: () => {
          toast({ title: "Merchant berhasil diperbarui" });
          setIsEditOpen(false);
          queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Error", description: (err as any).error?.error || "Gagal memperbarui", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!selectedMerchant) return;
    deleteMutation.mutate(
      { id: selectedMerchant.id },
      {
        onSuccess: () => {
          toast({ title: "Merchant berhasil dihapus" });
          setIsDeleteOpen(false);
          queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Error", description: (err as any).error?.error || "Gagal menghapus", variant: "destructive" });
        },
      }
    );
  };

  const MerchantForm = ({ onSubmit, isPending, label }: any) => (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div>
        <label className="vera-label">Nama Merchant</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="vera-input"
          required
        />
      </div>
      <div>
        <label className="vera-label">Kode Merchant (Unik)</label>
        <input
          type="text"
          value={formData.code}
          onChange={(e) =>
            setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, "") })
          }
          className="vera-input font-mono"
          required
        />
      </div>
      <div>
        <label className="vera-label">Callback URL (Opsional)</label>
        <input
          type="url"
          value={formData.callbackUrl}
          onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })}
          className="vera-input"
          placeholder="https://merchant.com/api/callback"
        />
      </div>
      <div className="flex items-center justify-between py-2">
        <Label htmlFor="isActive" className="cursor-pointer text-sm">
          Status Aktif
        </Label>
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Kelola entitas bisnis yang menggunakan gateway
        </p>
        <button className="btn-primary" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4" />
          Tambah Merchant
        </button>
      </div>

      {/* Table */}
      <div className="vera-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Kode", "Nama", "Callback URL", "Status", "Aksi"].map((h, i) => (
                  <th
                    key={h}
                    className={`py-3 px-4 text-xs font-bold uppercase tracking-wider ${i >= 3 ? "text-center" : "text-left"} ${i === 4 ? "text-right" : ""}`}
                    style={{
                      color: "var(--muted-foreground)",
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: "rgba(42,47,62,0.3)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Memuat data merchant...
                  </td>
                </tr>
              ) : merchants && merchants.length > 0 ? (
                merchants.map((merchant) => (
                  <tr
                    key={merchant.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid rgba(42,47,62,0.5)" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor =
                        "rgba(42,47,62,0.3)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                    }
                  >
                    <td className="py-3 px-4 font-mono text-xs font-bold">{merchant.code}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-medium">
                        <Store className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                        {merchant.name}
                      </div>
                    </td>
                    <td
                      className="py-3 px-4 text-xs max-w-[200px] truncate"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {merchant.callbackUrl || "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {merchant.isActive ? (
                        <span className="status-sukses inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="status-gagal inline-flex items-center gap-1">
                          <X className="w-3 h-3" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="btn-action"
                          onClick={() => handleOpenEdit(merchant)}
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          className="btn-action-danger"
                          onClick={() => handleOpenDelete(merchant)}
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Belum ada merchant terdaftar.
                  </td>
                </tr>
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
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus merchant <strong>{selectedMerchant?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Batal</Button>
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
