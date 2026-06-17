import React, { useState } from "react";
import { 
  useListSuksesTransactions, 
  getListSuksesTransactionsQueryKey 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, formatDate } from "@/lib/utils";
import { CheckCircle2, RefreshCw } from "lucide-react";

export function Sukses() {
  const [page, setPage] = useState(1);

  const queryParams = {
    page,
    limit: 15
  };

  const { data, isLoading, refetch } = useListSuksesTransactions(queryParams, {
    query: {
      queryKey: getListSuksesTransactionsQueryKey(queryParams)
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-green-500 flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6" />
            Verified Success
          </h1>
          <p className="text-muted-foreground text-sm">Exclusive view of completed transactions</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="border-green-500/20 text-green-500 hover:bg-green-500/10">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-green-500/20 bg-card overflow-hidden">
        <div className="h-1 w-full bg-green-500"></div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-mono uppercase text-xs w-[180px]">Reference</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Completion Time</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Customer/Merchant</TableHead>
                  <TableHead className="font-mono uppercase text-xs text-right">Amount Settled</TableHead>
                  <TableHead className="font-mono uppercase text-xs text-center w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">Verifying records...</TableCell>
                    </TableRow>
                  ))
                ) : data?.data && data.data.length > 0 ? (
                  data.data.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-medium">
                        {tx.ref}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(tx.updatedAt || tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{tx.customerId || '-'}</div>
                        <div className="text-xs text-muted-foreground">{tx.merchantName || '-'}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-green-500">
                        {formatRupiah(tx.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider bg-green-500/10 text-green-500 border-green-500/20">
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No successful transactions recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {data && data.total > 0 && (
            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
              <div className="text-xs text-muted-foreground font-mono">
                Records {(page - 1) * 15 + 1} - {Math.min(page * 15, data.total)} / {data.total}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                  className="border-green-500/20 hover:bg-green-500/10"
                >
                  Prev
                </Button>
                <div className="text-sm font-mono px-2 text-green-500">{page}</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 15 >= data.total || isLoading}
                  className="border-green-500/20 hover:bg-green-500/10"
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
