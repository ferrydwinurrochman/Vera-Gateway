import React, { useState } from "react";
import {
  useListMerchants,
  getListMerchantsQueryKey,
  useCreateMerchant,
  useUpdateMerchant,
  useDeleteMerchant,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

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

  return (
    <>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Merchant</div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
        Tambah & kelola merchant yang terdaftar di gateway.
      </div>

      {flash && <div className={`flash ${flash.type}`} style={{ marginBottom: 14 }}>{flash.msg}</div>}

      {!creating && !editId && (
        <div style={{ marginBottom: 12 }}>
          <button className="btn sm" onClick={() => { setCreating(true); setForm({ name: "", code: "", callbackUrl: "", isActive: true }); }}>
            + Tambah Merchant
          </button>
        </div>
      )}

      {(creating || editId) && (
        <div className="tablecard" style={{ padding: "18px 20px", marginBottom: 16, maxWidth: 560 }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>{creating ? "+ Tambah Merchant Baru" : "Edit Merchant"}</div>
          <form onSubmit={creating ? handleCreate : handleUpdate}>
            <div className="field">
              <label>Nama Merchant</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Nama merchant" />
            </div>
            <div className="field">
              <label>Kode Internal</label>
              <input
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                className="mono"
                required
                placeholder="Kode unik"
              />
            </div>
            <div className="field">
              <label>Callback URL (Opsional)</label>
              <input
                type="url"
                value={form.callbackUrl}
                onChange={e => setForm({ ...form, callbackUrl: e.target.value })}
                placeholder="https://merchant.com/api/callback"
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 16, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              Status Aktif
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn sm" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {creating ? "Tambah" : "Simpan"}
              </button>
              <button className="btn sm alt" type="button" onClick={() => { setCreating(false); setEditId(null); }}>Batal</button>
            </div>
          </form>
        </div>
      )}

      <div className="tablecard">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Kode</th><th>Nama</th><th>Callback URL</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5}><div className="empty">Memuat...</div></td></tr>
              ) : !merchants || merchants.length === 0 ? (
                <tr><td colSpan={5}><div className="empty">Belum ada merchant terdaftar.</div></td></tr>
              ) : merchants.map((m: any) => (
                <tr key={m.id}>
                  <td className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{m.code}</td>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td className="muted" style={{ fontSize: 12, maxWidth: 200 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.callbackUrl || "—"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${m.isActive ? "aktif" : "nonaktif"}`}>
                      {m.isActive ? "AKTIF" : "NONAKTIF"}
                    </span>
                  </td>
                  <td className="act">
                    <button className="abtn" onClick={() => openEdit(m)}>Edit</button>
                    <button className="abtn del" onClick={() => handleDelete(m.id, m.name)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
