import React, { useState } from "react";
import {
  useListUsers,
  getListUsersQueryKey,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListMerchants,
  getListMerchantsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Shield, Loader2, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function Users() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "operator" as any,
    merchantId: "" as string | number,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() },
  });

  const { data: merchants } = useListMerchants({
    query: { queryKey: getListMerchantsQueryKey() },
  });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const handleOpenCreate = () => {
    setFormData({ username: "", password: "", role: "operator", merchantId: "" });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      merchantId: user.merchantId || "",
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (user: any) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password) {
      toast({ title: "Error", description: "Password wajib diisi untuk pengguna baru", variant: "destructive" });
      return;
    }
    const payload = {
      ...formData,
      merchantId: formData.merchantId ? parseInt(formData.merchantId as string) : null,
    };
    createMutation.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast({ title: "User berhasil ditambahkan" });
          setIsCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Error", description: (err as any).error?.error || "Gagal menambahkan", variant: "destructive" });
        },
      }
    );
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const payload: any = {
      username: formData.username,
      role: formData.role,
      merchantId: formData.merchantId ? parseInt(formData.merchantId as string) : null,
    };
    if (formData.password) payload.password = formData.password;
    updateMutation.mutate(
      { id: selectedUser.id, data: payload },
      {
        onSuccess: () => {
          toast({ title: "User berhasil diperbarui" });
          setIsEditOpen(false);
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Error", description: (err as any).error?.error || "Gagal memperbarui", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!selectedUser) return;
    deleteMutation.mutate(
      { id: selectedUser.id },
      {
        onSuccess: () => {
          toast({ title: "User berhasil dihapus" });
          setIsDeleteOpen(false);
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Error", description: (err as any).error?.error || "Gagal menghapus", variant: "destructive" });
        },
      }
    );
  };

  const UserForm = ({ onSubmit, isPending, label, isEdit }: any) => (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div>
        <label className="vera-label">Username</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, "") })
          }
          className="vera-input font-mono"
          required
        />
      </div>
      <div>
        <label className="vera-label">
          {isEdit ? "Password Baru (kosongkan jika tidak diubah)" : "Password"}
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="vera-input"
          required={!isEdit}
        />
      </div>
      <div>
        <Label className="vera-label">Role</Label>
        <Select
          value={formData.role}
          onValueChange={(val: any) => setFormData({ ...formData, role: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin (Akses Penuh)</SelectItem>
            <SelectItem value="operator">Operator (Internal)</SelectItem>
            <SelectItem value="merchant">Merchant (API/Dashboard)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formData.role === "merchant" && (
        <div>
          <Label className="vera-label">Merchant Terkait</Label>
          <Select
            value={formData.merchantId.toString()}
            onValueChange={(val) => setFormData({ ...formData, merchantId: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih merchant" />
            </SelectTrigger>
            <SelectContent>
              {merchants?.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.name} ({m.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {label}
        </Button>
      </DialogFooter>
    </form>
  );

  const roleStyle = (role: string) => {
    switch (role) {
      case "admin": return { backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171" };
      case "operator": return { backgroundColor: "rgba(0,102,204,0.1)", color: "#60a5fa" };
      case "merchant": return { backgroundColor: "rgba(234,179,8,0.1)", color: "#facc15" };
      default: return {};
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Kelola akun dan hak akses pengguna
        </p>
        <button className="btn-primary" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4" />
          Tambah User
        </button>
      </div>

      {/* Table */}
      <div className="vera-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Username", "Role", "Merchant", "Dibuat", "Aksi"].map((h, i) => (
                  <th
                    key={h}
                    className={`py-3 px-4 text-xs font-bold uppercase tracking-wider ${i === 4 ? "text-right" : "text-left"}`}
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
                  <td colSpan={5} className="py-10 text-center" style={{ color: "var(--muted-foreground)" }}>
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users && users.length > 0 ? (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid rgba(42,47,62,0.5)" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(42,47,62,0.3)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                    }
                  >
                    <td className="py-3 px-4 font-mono font-bold flex items-center gap-2">
                      {user.username}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-bold uppercase"
                        style={roleStyle(user.role)}
                      >
                        {user.role === "admin" && <Shield className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {user.merchantId
                        ? merchants?.find((m) => m.id === user.merchantId)?.name || `ID: ${user.merchantId}`
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="btn-action" onClick={() => handleOpenEdit(user)}>
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button className="btn-action-danger" onClick={() => handleOpenDelete(user)}>
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center" style={{ color: "var(--muted-foreground)" }}>
                    Belum ada pengguna terdaftar.
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
            <DialogTitle>Tambah User Baru</DialogTitle>
            <DialogDescription>Buat akun pengguna baru.</DialogDescription>
          </DialogHeader>
          <UserForm onSubmit={handleCreate} isPending={createMutation.isPending} label="Buat Akun" isEdit={false} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Perbarui data untuk {selectedUser?.username}.</DialogDescription>
          </DialogHeader>
          <UserForm onSubmit={handleUpdate} isPending={updateMutation.isPending} label="Simpan Perubahan" isEdit={true} />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Hapus Akun
            </DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus akun <strong>{selectedUser?.username}</strong>? Pengguna akan kehilangan akses secara permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Hapus Akun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
