import { useGetDashboardSummary } from "@/api-client";
import type { StatusSummary } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, IndianRupee, FileText, ArrowUpRight, ArrowDownRight, CreditCard } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const { data: summary, isLoading, isError } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <Alert variant="destructive" data-testid="dash-error">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load dashboard summary.</AlertDescription>
      </Alert>
    );
  }

  const byType = summary.byType ?? [];
  const byStatus: StatusSummary[] = summary.byStatus ?? [];
  const recentVouchers = summary.recentVouchers ?? [];
  const byProject = summary.byProject ?? [];

  const paymentType = byType.find(t => t.voucherType === "payment");
  const receiveType = byType.find(t => t.voucherType === "receive");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Vouchers</CardTitle>
            <FileText className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="dash-total-count">{summary.totalCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Value</CardTitle>
            <IndianRupee className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="dash-total-amount">₹{Number(summary.totalAmount).toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payments</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive" data-testid="dash-payment-amount">
              ₹{Number(paymentType?.totalAmount || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{paymentType?.count || 0} vouchers</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Receipts</CardTitle>
            <ArrowDownRight className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-green-500" data-testid="dash-receive-amount">
              ₹{Number(receiveType?.totalAmount || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{receiveType?.count || 0} vouchers</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment status summary */}
      <Card className="bg-card border-border shadow-panel" data-testid="dash-payment-status-summary">
        <CardHeader className="flex flex-row items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <CardTitle className="text-lg font-bold uppercase tracking-wide">By Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          {byStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No data available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {byStatus.map((s: StatusSummary) => {
                const total = byStatus.reduce((acc, x) => acc + Number(x.totalAmount), 0);
                const pct = total > 0 ? Math.round((Number(s.totalAmount) / total) * 100) : 0;
                return (
                  <div key={s.paymentStatusId} className="flex flex-col gap-1 p-3 rounded-md border border-border bg-muted/20"
                    data-testid={`dash-status-${s.paymentStatusId}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{s.paymentStatusName}</span>
                      <span className="text-xs font-mono text-muted-foreground">{s.count} vouchers</span>
                    </div>
                    <div className="font-mono font-bold text-foreground">₹{Number(s.totalAmount).toLocaleString('en-IN')}</div>
                    <div className="w-full h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{pct}% of total</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent vouchers + by project */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-panel">
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase tracking-wide">Recent Vouchers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentVouchers.map((v) => (
                <div key={v.expenseId} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border"
                  data-testid={`dash-recent-${v.expenseId}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary">{v.voucherNumber}</span>
                      <span className="text-xs uppercase px-1.5 py-0.5 rounded-sm bg-background border border-border">{v.paymentStatusName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{v.projectName} · {v.vendorName}</div>
                  </div>
                  <div className={`font-mono font-bold ${v.voucherType === 'payment' ? 'text-destructive' : 'text-green-500'}`}>
                    {v.voucherType === 'payment' ? '-' : '+'}₹{Number(v.amount).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
              {recentVouchers.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">No recent vouchers found.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-panel">
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase tracking-wide">By Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {byProject.map((p) => (
                <div key={p.projectId} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                  data-testid={`dash-project-${p.projectId}`}>
                  <div>
                    <div className="font-bold">{p.projectName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">{p.count} vouchers</div>
                  </div>
                  <div className="font-mono font-bold text-foreground">
                    ₹{Number(p.totalAmount).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
              {byProject.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">No project data available.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
