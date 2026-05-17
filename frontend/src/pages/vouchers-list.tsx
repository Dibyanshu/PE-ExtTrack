import { useState } from "react";
import { Link } from "wouter";
import {
  useListExpenses,
  useListProjects,
  useListParticulars,
  useListPaymentStatuses,
  useDeleteExpense,
  getListExpensesQueryKey,
} from "@/api-client";
import type { ListExpensesVoucherType } from "@/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, Search, Eye, AlertCircle } from "lucide-react";
import { Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PAGE_SIZE = 20;

interface VouchersListProps {
  voucherType: "payment" | "receive";
}

export default function VouchersList({ voucherType }: VouchersListProps) {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [particularId, setParticularId] = useState<string>("");
  const [paymentStatusId, setPaymentStatusId] = useState<string>("");
  const [voucherNumber, setVoucherNumber] = useState("");
  const [deleteItem, setDeleteItem] = useState<{ id: number; voucherNumber: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const remove = useDeleteExpense();

  const params = {
    voucherType: voucherType as ListExpensesVoucherType,
    page,
    limit: PAGE_SIZE,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(projectId && projectId !== "all" ? { projectId: Number(projectId) } : {}),
    ...(particularId && particularId !== "all" ? { particularId: Number(particularId) } : {}),
    ...(paymentStatusId && paymentStatusId !== "all" ? { paymentStatusId: Number(paymentStatusId) } : {}),
    ...(voucherNumber ? { voucherNumber } : {}),
  };

  const { data: expenses, isLoading, isError: expensesError } = useListExpenses(params);
  const { data: projects } = useListProjects({ limit: 200 });
  const { data: particulars } = useListParticulars({ limit: 200 });
  const { data: statuses } = useListPaymentStatuses({ limit: 200 });

  const title = voucherType === "payment" ? "Payment Vouchers" : "Receive Vouchers";
  const prefix = voucherType === "payment" ? "PECRU-PV" : "PECRU-RV";
  const createPath = voucherType === "payment" ? "/vouchers/payment/new" : "/vouchers/receive/new";

  const totalPages = expenses ? Math.ceil(expenses.total / PAGE_SIZE) : 1;
  const canDelete = ["admin", "superadmin"].includes(role || "");

  function resetFilters() {
    setFrom(""); setTo(""); setProjectId(""); setParticularId("");
    setPaymentStatusId(""); setVoucherNumber(""); setPage(1);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    remove.mutate({ id: deleteItem.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey(params) });
        toast({ title: "Deleted", description: `${deleteItem.voucherNumber} deleted successfully.` });
        setDeleteItem(null);
        setDeleting(false);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        setDeleting(false);
      },
    });
  }

  if (expensesError) {
    return (
      <Alert variant="destructive" data-testid="vouchers-error">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load vouchers. Please try refreshing.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{prefix} series</p>
        </div>
        <Link href={createPath}>
          <Button className="gap-2 font-bold uppercase tracking-wide" data-testid="btn-create-voucher">
            <Plus className="w-4 h-4" /> New Voucher
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Search className="w-4 h-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold block mb-1">From</label>
              <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
                className="text-sm" data-testid="filter-from" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold block mb-1">To</label>
              <Input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
                className="text-sm" data-testid="filter-to" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold block mb-1">Project</label>
              <Select value={projectId} onValueChange={v => { setProjectId(v); setPage(1); }}>
                <SelectTrigger className="text-sm" data-testid="filter-project">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects?.data?.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold block mb-1">Particular</label>
              <Select value={particularId} onValueChange={v => { setParticularId(v); setPage(1); }}>
                <SelectTrigger className="text-sm" data-testid="filter-particular">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {particulars?.data?.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold block mb-1">Status</label>
              <Select value={paymentStatusId} onValueChange={v => { setPaymentStatusId(v); setPage(1); }}>
                <SelectTrigger className="text-sm" data-testid="filter-status">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {statuses?.data?.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold block mb-1">Voucher No.</label>
              <Input value={voucherNumber} onChange={e => { setVoucherNumber(e.target.value); setPage(1); }}
                placeholder="Search..." className="text-sm font-mono" data-testid="filter-voucher-number" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs uppercase tracking-wide" data-testid="btn-reset-filters">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border shadow-panel">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !expenses?.data?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm uppercase tracking-widest font-bold">No vouchers found</p>
              <p className="text-xs mt-2">Try adjusting filters or create a new voucher</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="vouchers-table">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Voucher No.</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Date</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Project</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Vendor</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Particular</th>
                      <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Amount</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Status</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Approved</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.data.map((row) => (
                      <tr key={row.expenseId}
                        className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                        data-testid={`row-voucher-${row.expenseId}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-primary text-sm">{row.voucherNumber}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.expenseDate}</td>
                        <td className="px-4 py-3 font-medium">{row.projectName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.vendorName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.particularName}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          ₹{Number(row.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{row.paymentStatusName}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {row.approvedAt ? (
                            <span className="text-green-500 font-semibold">Yes</span>
                          ) : row.finalizedAt ? (
                            <span className="text-primary font-semibold">Final</span>
                          ) : (
                            <span className="text-muted-foreground">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <Link href={`/vouchers/${row.expenseId}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`btn-view-${row.expenseId}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteItem({ id: row.expenseId, voucherNumber: row.voucherNumber })}
                                data-testid={`btn-delete-${row.expenseId}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground font-mono">
                  {expenses.total} total · page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8"
                    disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    data-testid="btn-prev-page">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8"
                    disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    data-testid="btn-next-page">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteItem} onOpenChange={open => !open && setDeleteItem(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide font-bold">Delete Voucher</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong className="text-foreground">{deleteItem?.voucherNumber}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)} data-testid="btn-cancel-delete">Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="font-bold uppercase tracking-wide"
              data-testid="btn-confirm-delete"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
