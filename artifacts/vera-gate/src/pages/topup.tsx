import React, { useState, useEffect } from "react";
import { 
  useGenerateTransaction,
  useGetTransaction,
  getGetTransactionQueryKey,
  useUpdateTransactionStatus
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatRupiah } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QrCode, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function Topup() {
  const [amount, setAmount] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [activeTxId, setActiveTxId] = useState<number | null>(null);
  const [cooldownError, setCooldownError] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const generateMutation = useGenerateTransaction();
  const updateStatusMutation = useUpdateTransactionStatus();

  const { data: activeTx } = useGetTransaction(activeTxId!, {
    query: {
      enabled: !!activeTxId,
      refetchInterval: 5000, // Poll every 5s while waiting
      queryKey: getGetTransactionQueryKey(activeTxId!)
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCooldownError(null);
    
    const numAmount = parseInt(amount.replace(/[^0-9]/g, ''));
    if (!numAmount || numAmount < 1000) {
      toast({
        title: "Invalid Amount",
        description: "Amount must be at least Rp 1.000",
        variant: "destructive"
      });
      return;
    }
    
    if (!customerId) {
      toast({
        title: "Invalid Customer ID",
        description: "Customer ID is required",
        variant: "destructive"
      });
      return;
    }

    generateMutation.mutate(
      { data: { amount: numAmount, customerId } },
      {
        onSuccess: (data) => {
          setActiveTxId(data.transaction.id);
          toast({
            title: "QRIS Generated",
            description: "Please scan the QR code to complete payment."
          });
        },
        onError: (error: any) => {
          if (error?.status === 409 && error?.error?.cooldownMinutes) {
            setCooldownError(error.error);
          } else {
            toast({
              title: "Generation Failed",
              description: error?.error?.error || "An error occurred",
              variant: "destructive"
            });
          }
        }
      }
    );
  };

  const handleCancel = () => {
    if (activeTxId) {
      updateStatusMutation.mutate(
        { id: activeTxId, data: { status: 'GAGAL', notes: 'Cancelled by user' } },
        {
          onSuccess: () => {
            setActiveTxId(null);
            setAmount("");
            setCustomerId("");
            toast({ title: "Transaction Cancelled" });
            queryClient.invalidateQueries({ queryKey: getGetTransactionQueryKey(activeTxId) });
          }
        }
      );
    }
  };

  const handleNew = () => {
    setActiveTxId(null);
    setAmount("");
    setCustomerId("");
    setCooldownError(null);
  };

  if (activeTx && activeTx.status === 'SUKSES') {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card className="border-green-500/50 bg-green-500/5 shadow-[0_0_30px_rgba(34,197,94,0.15)] text-center py-8">
          <CardContent className="space-y-6 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-500 mb-2">PAYMENT SUCCESSFUL</h2>
              <p className="text-3xl font-mono font-bold tracking-tighter">{formatRupiah(activeTx.amount)}</p>
              <p className="text-muted-foreground mt-2 font-mono text-sm">REF: {activeTx.ref}</p>
            </div>
            <Button onClick={handleNew} className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-widest">
              Generate New QRIS
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTxId && activeTx && activeTx.qrCode) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="border-primary/50 shadow-[0_0_30px_rgba(0,120,255,0.15)] overflow-hidden">
          <div className="bg-primary p-4 text-center">
            <h2 className="text-primary-foreground font-bold text-xl tracking-widest">SCAN TO PAY</h2>
            <p className="text-primary-foreground/80 font-mono text-sm mt-1">{formatRupiah(activeTx.amount)}</p>
          </div>
          <CardContent className="p-6 flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl shadow-inner w-full max-w-[80vw] sm:max-w-full aspect-square flex items-center justify-center" style={{ maxHeight: "50vh" }}>
              <img 
                src={activeTx.qrCode} 
                alt="QRIS Code" 
                className="w-full h-full object-contain mix-blend-multiply"
              />
            </div>
            
            <div className="mt-6 text-center space-y-2 w-full">
              <p className="font-mono text-lg font-bold tracking-widest bg-muted/50 py-2 rounded border border-border">
                {formatRupiah(activeTx.amount)}
              </p>
              <p className="text-xs text-muted-foreground font-mono">REF: {activeTx.ref}</p>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs p-3 rounded text-center mt-4 font-bold tracking-wider">
                QRIS SEKALI PAKAI, KE MENU TOPUP LAGI UNTUK TOPUP SELANJUTNYA
              </div>
            </div>
            
            <div className="w-full mt-6 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Waiting for payment...
              </div>
              <Button variant="destructive" className="w-full" onClick={handleCancel}>
                Cancel Transaction
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QRIS Generation</h1>
        <p className="text-muted-foreground text-sm">Create dynamic QRIS for customer topup</p>
      </div>

      {cooldownError && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-bold">Active Transaction Exists</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p>{cooldownError.error}</p>
            <div className="bg-background/50 p-2 rounded font-mono text-xs mt-2">
              <div>REF: {cooldownError.existingRef}</div>
              <div>Remaining Time: {cooldownError.remainingMinutes} minutes</div>
            </div>
            <p className="text-xs mt-2">Please complete or wait for the existing transaction to expire.</p>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            New Transaction
          </CardTitle>
          <CardDescription>Enter details to generate a unique QRIS</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="customerId" className="uppercase text-xs tracking-wider text-muted-foreground font-bold">Customer ID / Account</Label>
              <Input 
                id="customerId" 
                placeholder="CUST-12345" 
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="font-mono text-lg bg-background/50 h-12"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount" className="uppercase text-xs tracking-wider text-muted-foreground font-bold">Amount (IDR)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-muted-foreground">Rp</span>
                <Input 
                  id="amount" 
                  placeholder="50000" 
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setAmount(val ? parseInt(val).toLocaleString('id-ID') : '');
                  }}
                  className="font-mono text-2xl font-bold pl-12 h-14 bg-background/50"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 font-bold tracking-widest text-sm uppercase" 
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <QrCode className="mr-2 h-5 w-5" />}
              {generateMutation.isPending ? "GENERATING..." : "GENERATE QRIS"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
