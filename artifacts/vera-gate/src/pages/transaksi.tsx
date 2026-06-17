import React, { useState } from "react";
import { 
  useListTransactions, 
  getListTransactionsQueryKey,
  useUpdateTransactionStatus,
  useCheckTransactionStatus
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, getStatusColor, formatDate, cn } from "@/lib/utils";
import { Search, RefreshCw, Eye, Edit2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

export function Transaksi() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 500);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryParams = {
    page,
    limit: 10,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== "all" ? { status: status as any } : {})
  };

  const { data, isLoading, refetch } = useListTransactions(queryParams, {
    query: {
      queryKey: getListTransactionsQueryKey(queryParams)
    }
  });

  const checkStatusMutation = useCheckTransactionStatus();

  const handleRefreshStatus = (id: number) => {
    checkStatusMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Status updated successfully" });
        refetch();
      },
      onError: (error) => {
        toast({ 
          title: "Failed to update status", 
          description: error.error?.error || "An error occurred",
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions Ledger</h1>
          <p className="text-muted-foreground text-sm">Comprehensive record of all operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="py-4 px-6 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search REF or Customer ID..."
                className="pl-9 font-mono text-sm bg-background/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background/50">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ALL STATUS</SelectItem>
                  <SelectItem value="MENUNGGU">MENUNGGU</SelectItem>
                  <SelectItem value="SUKSES">SUKSES</SelectItem>
                  <SelectItem value="GAGAL">GAGAL</SelectItem>
                  <SelectItem value="KEDALUWARSA">KEDALUWARSA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-mono uppercase text-xs w-[180px]">Reference</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Time</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Customer/Merchant</TableHead>
                  <TableHead className="font-mono uppercase text-xs text-right">Amount</TableHead>
                  <TableHead className="font-mono uppercase text-xs text-center w-[120px]">Status</TableHead>
                  <TableHead className="font-mono uppercase text-xs text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ))
                ) : data?.data && data.data.length > 0 ? (
                  data.data.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-medium">
                        {tx.ref}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{tx.customerId || '-'}</div>
                        <div className="text-xs text-muted-foreground">{tx.merchantName || '-'}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatRupiah(tx.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-mono tracking-wider", getStatusColor(tx.status))}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {tx.status === 'MENUNGGU' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => handleRefreshStatus(tx.id)}
                              title="Check Status from Provider"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No transactions found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {data && data.total > 0 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <div className="text-xs text-muted-foreground font-mono">
                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, data.total)} of {data.total}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  Prev
                </Button>
                <div className="text-sm font-mono px-2">{page}</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 10 >= data.total || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
