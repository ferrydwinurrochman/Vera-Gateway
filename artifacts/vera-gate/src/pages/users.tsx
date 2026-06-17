import React, { useState } from "react";
import { 
  useListUsers, 
  getListUsersQueryKey,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListMerchants,
  getListMerchantsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, UserCog, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function Users() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "operator" as any,
    merchantId: "" as string | number
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const { data: merchants } = useListMerchants({
    query: { queryKey: getListMerchantsQueryKey() }
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
      password: "", // empty for edit
      role: user.role,
      merchantId: user.merchantId || ""
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
      toast({ title: "Error", description: "Password is required for new users", variant: "destructive" });
      return;
    }
    
    const payload = {
      ...formData,
      merchantId: formData.merchantId ? parseInt(formData.merchantId as string) : null
    };
    
    createMutation.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "User Created" });
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error?.error || "Failed to create", variant: "destructive" });
      }
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    const payload: any = {
      username: formData.username,
      role: formData.role,
      merchantId: formData.merchantId ? parseInt(formData.merchantId as string) : null
    };
    
    if (formData.password) {
      payload.password = formData.password;
    }
    
    updateMutation.mutate({ id: selectedUser.id, data: payload }, {
      onSuccess: () => {
        toast({ title: "User Updated" });
        setIsEditOpen(false);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error?.error || "Failed to update", variant: "destructive" });
      }
    });
  };

  const handleDelete = () => {
    if (!selectedUser) return;
    
    deleteMutation.mutate({ id: selectedUser.id }, {
      onSuccess: () => {
        toast({ title: "User Deleted" });
        setIsDeleteOpen(false);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error?.error || "Failed to delete", variant: "destructive" });
      }
    });
  };

  const UserForm = ({ onSubmit, isPending, label, isEdit }: any) => (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input 
          id="username" 
          value={formData.username} 
          onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} 
          className="font-mono lowercase"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{isEdit ? "New Password (leave blank to keep current)" : "Password"}</Label>
        <Input 
          id="password" 
          type="password"
          value={formData.password} 
          onChange={e => setFormData({...formData, password: e.target.value})} 
          required={!isEdit}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role Authorization</Label>
        <Select value={formData.role} onValueChange={(val: any) => setFormData({...formData, role: val})}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin (Full Access)</SelectItem>
            <SelectItem value="operator">Operator (Internal Tools)</SelectItem>
            <SelectItem value="merchant">Merchant (API/Dashboard Only)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {formData.role === "merchant" && (
        <div className="space-y-2">
          <Label htmlFor="merchantId">Linked Merchant Entity</Label>
          <Select 
            value={formData.merchantId.toString()} 
            onValueChange={val => setFormData({...formData, merchantId: val})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select associated merchant" />
            </SelectTrigger>
            <SelectContent>
              {merchants?.map(m => (
                <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <DialogFooter className="pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {label}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Access Control</h1>
          <p className="text-muted-foreground text-sm">Manage terminal operators and merchant credentials</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Provision Account
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-mono uppercase text-xs w-[200px]">Operator ID</TableHead>
                <TableHead className="font-mono uppercase text-xs">Authorization</TableHead>
                <TableHead className="font-mono uppercase text-xs">Entity Link</TableHead>
                <TableHead className="font-mono uppercase text-xs">Provisioned</TableHead>
                <TableHead className="font-mono uppercase text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Loading registry...</TableCell>
                </TableRow>
              ) : users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm font-bold flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      {user.username}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-mono uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-red-500/10 text-red-500' :
                        user.role === 'operator' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {user.role === 'admin' && <Shield className="h-3 w-3" />}
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.merchantId ? (
                        merchants?.find(m => m.id === user.merchantId)?.name || `ID: ${user.merchantId}`
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(user)} className="h-8 w-8">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(user)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No accounts found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provision Account</DialogTitle>
            <DialogDescription>Create a new access credential.</DialogDescription>
          </DialogHeader>
          <UserForm onSubmit={handleCreate} isPending={createMutation.isPending} label="Create Account" isEdit={false} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify Authorization</DialogTitle>
            <DialogDescription>Update credentials for {selectedUser?.username}.</DialogDescription>
          </DialogHeader>
          <UserForm onSubmit={handleUpdate} isPending={updateMutation.isPending} label="Apply Changes" isEdit={true} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Revoke Access
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete the account <strong>{selectedUser?.username}</strong>? They will immediately lose access to the terminal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Revoke Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
