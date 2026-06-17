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
    setFormData({ username: user.username, password: "", role: user.role, merchantId: user.merchantId || "" });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (user: any) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password) { alert("Password wajib diisi untuk pengguna baru"); return; }
    const payload = { ...formData, merchantId: formData.merchantId ? parseInt(formData.merchantId as string) : null };
    createMutation.mutate(
      { data: payload },
      {
        onSuccess: () => { setIsCreateOpen(false); queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); },
        onError: (err) => alert((err as any).error?.error || "Gagal menambahkan"),
      }
    );
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const payload: any = { username: formData.username, role: formData.role, merchantId: formData.merchantId ? parseInt(formData.merchantId as string) : null };
    if (formData.password) payload.password = formData.password;
    updateMutation.mutate(
      { id: selectedUser.id, data: payload },
      {
        onSuccess: () => { setIsEditOpen(false); queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); },
        onError: (err) => alert((err as any).error?.error || "Gagal memperbarui"),
      }
    );
  };

  const handleDelete = () => {
    if (!selectedUser) return;
    deleteMutation.mutate(
      { id: selectedUser.id },
      {
        onSuccess: () => { setIsDeleteOpen(false); queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); },
        onError: (err) => alert((err as any).error?.error || "Gagal menghapus"),
      }
    );
  };

  const roleBadgeCls: Record<string, string> = { admin: "admin", operator: "operator", merchant: "menunggu" };

  const UserForm = ({ onSubmit, isPending, label, isEdit }: any) => (
    <form onSubmit={onSubmit}>
      <div className="field">
        <label>Username</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
          className="mono"
          required
        />
      </div>
      <div className="field">
        <label>{isEdit ? "Password Baru (kosongkan jika tidak diubah)" : "Password"}</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required={!isEdit}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <Label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Role</Label>
        <Select value={formData.role} onValueChange={(val: any) => setFormData({ ...formData, role: val })}>
          <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin (Akses Penuh)</SelectItem>
            <SelectItem value="operator">Operator (Internal)</SelectItem>
            <SelectItem value="merchant">Merchant (API/Dashboard)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formData.role === "merchant" && (
        <div style={{ marginBottom: 16 }}>
          <Label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Merchant Terkait</Label>
          <Select value={formData.merchantId.toString()} onValueChange={(val) => setFormData({ ...formData, merchantId: val })}>
            <SelectTrigger><SelectValue placeholder="Pilih merchant" /></SelectTrigger>
            <SelectContent>
              {merchants?.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.code})</SelectItem>
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

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p className="muted" style={{ fontSize: 13 }}>Kelola akun dan hak akses pengguna</p>
        <button className="btn sm" onClick={handleOpenCreate} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Plus style={{ width: 15, height: 15 }} />
          Tambah User
        </button>
      </div>

      {/* Table */}
      <div className="tablecard">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Merchant</th>
                <th>Dibuat</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="empty">Memuat data pengguna...</td></tr>
              ) : users && users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="uname mono">
                        {user.role === "admin" && <Shield style={{ width: 12, height: 12 }} />}
                        {user.username}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${roleBadgeCls[user.role] || "operator"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {user.merchantId
                        ? merchants?.find((m) => m.id === user.merchantId)?.name || `ID: ${user.merchantId}`
                        : "-"}
                    </td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{formatDate(user.createdAt)}</td>
                    <td style={{ textAlign: "right" }} className="act">
                      <button className="abtn" onClick={() => handleOpenEdit(user)}>
                        <Edit2 style={{ width: 11, height: 11 }} /> Edit
                      </button>
                      <button className="abtn del" onClick={() => handleOpenDelete(user)}>
                        <Trash2 style={{ width: 11, height: 11 }} /> Hapus
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="empty">Belum ada pengguna terdaftar.</td></tr>
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
            <DialogTitle style={{ color: "var(--red)", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle style={{ width: 20, height: 20 }} />
              Hapus Akun
            </DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus akun <strong>{selectedUser?.username}</strong>? Pengguna akan kehilangan akses secara permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter style={{ marginTop: 8 }}>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Hapus Akun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
