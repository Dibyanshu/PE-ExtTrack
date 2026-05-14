import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetExpense,
  useGetExpenseHistory,
  useApproveExpense,
  useFinalizeExpense,
  useUploadExpenseDocuments,
  getGetExpenseQueryKey,
  getGetExpenseHistoryQueryKey,
  getListExpensesQueryKey,
} from "@workspace/api-client-react";
import type {
  ExpenseDetailResponseData,
  Document as VoucherDocument,
  UploadExpenseDocumentsBody,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertCircle, ArrowLeft, CheckCircle, Lock, History, Upload, FileText, Pencil } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function VoucherDetail() {
  const [, params] = useRoute("/vouchers/:id");
  const id = Number(params?.id);
  const { role, canViewHistory } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);

  const { data: expenseResp, isLoading, isError } = useGetExpense(id, {
    query: { enabled: !!id, queryKey: getGetExpenseQueryKey(id) },
  });
  const { data: historyResp } = useGetExpenseHistory(id, {
    query: { enabled: !!id && canViewHistory, queryKey: getGetExpenseHistoryQueryKey(id) },
  });

  const approveMutation = useApproveExpense();
  const finalizeMutation = useFinalizeExpense();
  const uploadMutation = useUploadExpenseDocuments();

  const expense = expenseResp?.data as ExpenseDetailResponseData | undefined;

  const canApprove = ["accounts", "admin", "superadmin"].includes(role || "");
  const canFinalize = ["accounts", "admin", "superadmin"].includes(role || "");

  function handleApprove() {
    approveMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetExpenseQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        toast({ title: "Approved", description: "Voucher approved successfully." });
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  function handleFinalize() {
    finalizeMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetExpenseQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        toast({ title: "Finalized", description: "Voucher finalized." });
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  function handleUpload() {
    if (!uploadFiles || !uploadFiles.length) return;
    const body: UploadExpenseDocumentsBody = {
      files: Array.from(uploadFiles) as Blob[],
    };
    uploadMutation.mutate({ id, data: body }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetExpenseQueryKey(id) });
        setUploadFiles(null);
        toast({ title: "Uploaded", description: "Documents uploaded." });
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (isError || !expense) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Voucher not found or failed to load.</AlertDescription>
      </Alert>
    );
  }

  const backPath = expense.voucherType === "payment" ? "/vouchers/payment" : "/vouchers/receive";
  const prefix = expense.voucherType === "payment" ? "Payment" : "Receive";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={backPath}>
            <Button variant="ghost" size="icon" data-testid="btn-back"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold text-primary" data-testid="voucher-number">{expense.voucherNumber}</span>
              <Badge variant="outline">{prefix} Voucher</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{expense.projectName} · {expense.vendorName}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!expense.finalizedAt && (
            <Link href={`/vouchers/${id}/edit`}>
              <Button variant="outline" className="gap-2 font-bold uppercase tracking-wide" data-testid="btn-edit">
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            </Link>
          )}
          {canApprove && !expense.approvedAt && !expense.finalizedAt && (
            <Button variant="outline" className="gap-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white font-bold uppercase tracking-wide"
              onClick={handleApprove} disabled={approveMutation.isPending} data-testid="btn-approve">
              <CheckCircle className="w-4 h-4" />
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          )}
          {canFinalize && expense.approvedAt && !expense.finalizedAt && (
            <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold uppercase tracking-wide"
              onClick={handleFinalize} disabled={finalizeMutation.isPending} data-testid="btn-finalize">
              <Lock className="w-4 h-4" />
              {finalizeMutation.isPending ? "Finalizing..." : "Finalize"}
            </Button>
          )}
          {canViewHistory && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 font-bold uppercase tracking-wide" data-testid="btn-history">
                  <History className="w-4 h-4" /> History
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-96 bg-card border-border">
                <SheetHeader>
                  <SheetTitle className="text-lg font-bold uppercase tracking-wide">Version History</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4 overflow-y-auto">
                  {historyResp?.data?.map((v) => (
                    <div key={v.id} className="border border-border rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-primary text-sm">v{v.versionNo}</span>
                        <span className="text-xs text-muted-foreground font-mono">{v.voucherNumber}</span>
                      </div>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <div>Date: <span className="text-foreground">{v.expenseDate}</span></div>
                        <div>Particular: <span className="text-foreground">{v.particularName}</span></div>
                        <div>Qty: <span className="text-foreground font-mono">{v.quantity} {v.uomName}</span></div>
                        <div>Amount: <span className="text-foreground font-mono">₹{Number(v.amount).toLocaleString('en-IN')}</span></div>
                      </div>
                    </div>
                  ))}
                  {!historyResp?.data?.length && (
                    <p className="text-sm text-muted-foreground text-center py-8">No history available.</p>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant={expense.approvedAt ? "default" : "outline"} data-testid="status-approved">
          {expense.approvedAt ? "Approved" : "Not Approved"}
        </Badge>
        <Badge variant={expense.finalizedAt ? "default" : "outline"} data-testid="status-finalized">
          {expense.finalizedAt ? "Finalized" : "Not Finalized"}
        </Badge>
        <Badge variant="secondary">{expense.paymentStatusName}</Badge>
        <span className="text-xs text-muted-foreground font-mono self-center">v{expense.versionNo}</span>
      </div>

      {/* Main details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-panel">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Voucher Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Voucher Number" value={<span className="font-mono font-bold text-primary">{expense.voucherNumber}</span>} />
            <DetailRow label="Type" value={prefix} />
            <DetailRow label="Date" value={<span className="font-mono">{expense.expenseDate}</span>} />
            <DetailRow label="Project" value={expense.projectName} />
            <DetailRow label="Vendor" value={expense.vendorName} />
            <DetailRow label="Invoice No." value={expense.invoiceNumber || <span className="text-muted-foreground italic">N/A</span>} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-panel">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Line Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Particular" value={expense.particularName} />
            <DetailRow label="UOM" value={expense.uomName} />
            <DetailRow label="Quantity" value={<span className="font-mono">{expense.quantity}</span>} />
            <DetailRow label="Price/Unit" value={<span className="font-mono">₹{Number(expense.pricePerUnit).toLocaleString('en-IN')}</span>} />
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Total Amount</span>
              <span className="font-mono text-2xl font-bold text-primary" data-testid="detail-amount">
                ₹{Number(expense.amount).toLocaleString('en-IN')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {(expense.description || expense.transactionDetails) && (
        <Card className="bg-card border-border shadow-panel">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expense.description && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Description</div>
                <p className="text-sm" data-testid="detail-description">{expense.description}</p>
              </div>
            )}
            {expense.transactionDetails && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Transaction Details</div>
                <p className="text-sm font-mono whitespace-pre-wrap" data-testid="detail-transaction">{expense.transactionDetails}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <Card className="bg-card border-border shadow-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {expense.documents?.length ? (
            <div className="space-y-2">
              {expense.documents.map((doc: VoucherDocument) => (
                <div key={doc.id} className="flex items-center justify-between p-2 rounded border border-border bg-muted/20"
                  data-testid={`doc-${doc.id}`}>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{doc.originalName}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  {doc.publicUrl && (
                    <a href={doc.publicUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="text-xs" data-testid={`btn-download-${doc.id}`}>Download</Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No documents attached.</p>
          )}
          {!expense.finalizedAt && (
            <div className="pt-3 border-t border-border flex items-center gap-3">
              <input
                type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setUploadFiles(e.target.files)}
                className="text-sm text-muted-foreground file:mr-3 file:px-3 file:py-1 file:rounded file:border file:border-border file:text-xs file:font-bold file:uppercase file:tracking-wide file:bg-muted file:text-foreground"
                data-testid="input-file-upload"
              />
              <Button size="sm" variant="outline" className="gap-2 font-bold uppercase tracking-wide text-xs"
                onClick={handleUpload} disabled={!uploadFiles?.length || uploadMutation.isPending}
                data-testid="btn-upload-docs">
                <Upload className="w-3 h-3" />
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-6 text-xs text-muted-foreground font-mono">
            <span>Created: {new Date(expense.createdAt).toLocaleString('en-IN')}</span>
            <span>Updated: {new Date(expense.updatedAt).toLocaleString('en-IN')}</span>
            {expense.approvedAt && <span className="text-green-500">Approved: {new Date(expense.approvedAt).toLocaleString('en-IN')}</span>}
            {expense.finalizedAt && <span className="text-primary">Finalized: {new Date(expense.finalizedAt).toLocaleString('en-IN')}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
      <span className="text-sm font-medium text-right max-w-xs">{value}</span>
    </div>
  );
}
