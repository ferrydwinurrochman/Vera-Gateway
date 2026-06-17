import React, { useState } from "react";
import { 
  useListMerchants, 
  getListMerchantsQueryKey,
  useCreateMerchant,
  useUpdateMerchant,
  useDeleteMerchant
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
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Store, Check, X, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function Merchants() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    callbackUrl: "",
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: merchants, isLoading } = useListMerchants({
    query: {
      queryKey: getListMerchantsQueryKey()
    }
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
      isActive: merchant.isActive
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (merchant: any) => {
    setSelectedMerchant(merchant);
    setIsDeleteOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "Merchant Created" });
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error?.error || "Failed to create", variant: "destructive" });
      }
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;
    
    updateMutation.mutate({ id: selectedMerchant.id, data: formData }, {
      onSuccess: () => {
        toast({ title: "Merchant Updated" });
        setIsEditOpen(false);
        queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error?.error || "Failed to update", variant: "destructive" });
      }
    });
  };

  const handleDelete = () => {
    if (!selectedMerchant) return;
    
    deleteMutation.mutate({ id: selectedMerchant.id }, {
      onSuccess: () => {
        toast({ title: "Merchant Deleted" });
        setIsDeleteOpen(false);
        queryClient.invalidateQueries({ queryKey: getListMerchantsQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.error?.error || "Failed to delete", variant: "destructive" });
      }
    });
  };

  const MerchantForm = ({ onSubmit, isPending, label }: any) => (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Merchant Name</Label>
        <Input 
          id="name" 
          value={formData.name} 
          onChange={e => setFormData({...formData, name: e.target.value})} 
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="code">Merchant Code (Unique)</Label>
        <Input 
          id="code" 
          value={formData.code} 
          onChange={e => setFormData({...formData, code: e.target.value.toUpperCase().replace(/\s/g, '')})} 
          className="font-mono uppercase"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="callbackUrl">Callback URL (Optional)</Label>
        <Input 
          id="callbackUrl" 
          type="url"
          value={formData.callbackUrl} 
          onChange={e => setFormData({...formData, callbackUrl: e.target.value})} 
          placeholder="https://merchant.com/api/callback"
        />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Label htmlFor="isActive" className="cursor-pointer">Active Status</Label>
        <Switch 
          id="isActive" 
          checked={formData.isActive} 
          onCheckedChange={checked => setFormData({...formData, isActive: checked})} 
        />
      </div>
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
          <h1 className="text-2xl font-bold tracking-tight">Merchant Registry</h1>
          <p className="text-muted-foreground text-sm">Manage business entities accessing the gateway</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Merchant
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-mono uppercase text-xs">Code</TableHead>
                <TableHead className="font-mono uppercase text-xs">Name</TableHead>
                <TableHead className="font-mono uppercase text-xs">Callback URL</TableHead>
                <TableHead className="font-mono uppercase text-xs text-center">Status</TableHead>
                <TableHead className="font-mono uppercase text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Loading merchants...</TableCell>
                </TableRow>
              ) : merchants && merchants.length > 0 ? (
                merchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell className="font-mono text-xs font-bold">{merchant.code}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      {merchant.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {merchant.callbackUrl || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {merchant.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-500/10 px-2 py-1 rounded">
                          <X className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(merchant)} className="h-8 w-8">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(merchant)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No merchants found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Merchant</DialogTitle>
            <DialogDescription>Create a new business entity profile.</DialogDescription>
          </DialogHeader>
          <MerchantForm onSubmit={handleCreate} isPending={createMutation.isPending} label="Register Merchant" />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Merchant</DialogTitle>
            <DialogDescription>Modify settings for {selectedMerchant?.name}.</DialogDescription>
          </DialogHeader>
          <MerchantForm onSubmit={handleUpdate} isPending={updateMutation.isPending} label="Save Changes" />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the merchant <strong>{selectedMerchant?.name}</strong>? This action cannot be undone and will prevent future transactions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Merchant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Needed for AlertTriangle
import { AlertTriangle } from "lucide-react";
