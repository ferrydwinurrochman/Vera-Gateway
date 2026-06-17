import React from "react";
import { 
  useGetDashboardSummary, 
  getGetDashboardSummaryQueryKey,
  useGetDashboardRecent,
  getGetDashboardRecentQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah, getStatusColor, formatDate, cn } from "@/lib/utils";
import { 
  Activity, 
  ArrowUpRight, 
  CreditCard, 
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Store
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary(
    { period: 'today' }, 
    { 
      query: { 
        refetchInterval: 7000, 
        queryKey: getGetDashboardSummaryQueryKey({ period: 'today' }) 
      } 
    }
  );

  const { data: recent, isLoading: isLoadingRecent } = useGetDashboardRecent(
    { limit: 10 },
    {
      query: {
        refetchInterval: 7000,
        queryKey: getGetDashboardRecentQueryKey({ limit: 10 })
      }
    }
  );

  const StatCard = ({ title, value, subtext, icon: Icon, isLoading }: any) => (
    <Card className="bg-card border-border overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Icon className="w-16 h-16" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Real-time Overview</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live connection established. Auto-refresh active.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Today's Volume" 
          value={summary ? formatRupiah(summary.todayAmount) : "Rp 0"}
          subtext={`${summary?.todayCount || 0} transactions today`}
          icon={Wallet}
          isLoading={isLoadingSummary}
        />
        <StatCard 
          title="Total Volume (All Time)" 
          value={summary ? formatRupiah(summary.totalAmount) : "Rp 0"}
          subtext={`${summary?.totalTransactions || 0} total transactions`}
          icon={Activity}
          isLoading={isLoadingSummary}
        />
        <StatCard 
          title="Success Rate" 
          value={
            summary && summary.todayCount > 0 
              ? `${Math.round((summary.byStatus.find(s => s.status === 'SUKSES')?.count || 0) / summary.todayCount * 100)}%` 
              : "0%"
          }
          subtext="Based on today's data"
          icon={CheckCircle2}
          isLoading={isLoadingSummary}
        />
        <StatCard 
          title="Active Merchants" 
          value={summary?.topMerchants?.length || 0}
          subtext="With transactions today"
          icon={Store}
          isLoading={isLoadingSummary}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-5 bg-card border-border">
          <CardHeader>
            <CardTitle>Recent Activity Stream</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRecent ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recent?.data && recent.data.length > 0 ? (
              <div className="space-y-1">
                {recent.data.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 group">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-full", getStatusColor(tx.status).replace('border-', 'bg-').replace('text-', 'text-'))}>
                        {tx.status === 'SUKSES' && <CheckCircle2 className="h-4 w-4" />}
                        {tx.status === 'MENUNGGU' && <Clock className="h-4 w-4" />}
                        {tx.status === 'GAGAL' && <XCircle className="h-4 w-4" />}
                        {tx.status === 'KEDALUWARSA' && <AlertCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-sm">{tx.ref}</span>
                          <Badge variant="outline" className={cn("text-[10px] uppercase font-mono px-1.5 py-0", getStatusColor(tx.status))}>
                            {tx.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {tx.merchantName || 'Unknown Merchant'} • {tx.customerId || 'No Customer ID'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm">
                        {formatRupiah(tx.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        {new Date(tx.createdAt).toLocaleTimeString('id-ID')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No recent transactions found.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : summary?.byStatus ? (
              <div className="space-y-4">
                {summary.byStatus.map((status) => (
                  <div key={status.status} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", 
                          status.status === 'SUKSES' ? 'bg-green-500' : 
                          status.status === 'MENUNGGU' ? 'bg-yellow-500' : 
                          status.status === 'GAGAL' ? 'bg-red-500' : 'bg-gray-500'
                        )} />
                        <span className="font-medium">{status.status}</span>
                      </div>
                      <span className="font-mono">{status.count}</span>
                    </div>
                    <div className="text-xs text-muted-foreground text-right font-mono">
                      {formatRupiah(status.amount)}
                    </div>
                    {summary.totalTransactions > 0 && (
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mt-1">
                        <div 
                          className={cn("h-full", 
                            status.status === 'SUKSES' ? 'bg-green-500' : 
                            status.status === 'MENUNGGU' ? 'bg-yellow-500' : 
                            status.status === 'GAGAL' ? 'bg-red-500' : 'bg-gray-500'
                          )} 
                          style={{ width: `${(status.count / summary.totalTransactions) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
