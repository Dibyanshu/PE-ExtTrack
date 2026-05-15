import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  useListProjects,
  useListVendors,
  useListParticulars,
  useListUom,
  useListPaymentStatuses,
  useCreatePaymentVoucher,
  useCreateReceiveVoucher,
  useUploadExpenseDocuments,
  getListExpensesQueryKey,
} from "@/api-client";
import type { UploadExpenseDocumentsBody } from "@/api-client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Link } from "wouter";

const voucherSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  expenseDate: z.string().min(1, "Date is required"),
  particularId: z.string().min(1, "Particular is required"),
  uomId: z.string().min(1, "UOM is required"),
  quantity: z.string().min(1, "Quantity is required").refine(v => !isNaN(Number(v)) && Number(v) > 0, "Must be > 0"),
  pricePerUnit: z.string().min(1, "Price is required").refine(v => !isNaN(Number(v)) && Number(v) >= 0, "Must be >= 0"),
  paymentStatusId: z.string().min(1, "Payment status is required"),
  invoiceNumber: z.string().optional(),
  description: z.string().optional(),
  transactionDetails: z.string().optional(),
});

type VoucherFormValues = z.infer<typeof voucherSchema>;

interface VoucherCreateProps {
  voucherType: "payment" | "receive";
}

export default function VoucherCreate({ voucherType }: VoucherCreateProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: projects } = useListProjects({ limit: 200 });
  const { data: vendors } = useListVendors({ limit: 200 });
  const { data: particulars } = useListParticulars({ limit: 200 });
  const { data: uoms } = useListUom({ limit: 200 });
  const { data: statuses } = useListPaymentStatuses({ limit: 200 });

  const createPayment = useCreatePaymentVoucher();
  const createReceive = useCreateReceiveVoucher();
  const uploadMutation = useUploadExpenseDocuments();
  const mutation = voucherType === "payment" ? createPayment : createReceive;

  const title = voucherType === "payment" ? "New Payment Voucher" : "New Receive Voucher";
  const backPath = voucherType === "payment" ? "/vouchers/payment" : "/vouchers/receive";

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      projectId: "", vendorId: "", expenseDate: "",
      particularId: "", uomId: "", quantity: "",
      pricePerUnit: "", paymentStatusId: "",
      invoiceNumber: "", description: "", transactionDetails: "",
    },
  });

  const qty = Number(form.watch("quantity") || 0);
  const ppu = Number(form.watch("pricePerUnit") || 0);
  const computedAmount = (qty * ppu).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setAttachments(prev => [...prev, ...Array.from(files)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  const onSubmit = (values: VoucherFormValues) => {
    mutation.mutate(
      {
        data: {
          projectId: Number(values.projectId),
          vendorId: Number(values.vendorId),
          expenseDate: values.expenseDate,
          particularId: Number(values.particularId),
          uomId: Number(values.uomId),
          quantity: Number(values.quantity),
          pricePerUnit: Number(values.pricePerUnit),
          paymentStatusId: Number(values.paymentStatusId),
          ...(values.invoiceNumber ? { invoiceNumber: values.invoiceNumber } : {}),
          ...(values.description ? { description: values.description } : {}),
          ...(values.transactionDetails ? { transactionDetails: values.transactionDetails } : {}),
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          const newId = data.data.expenseId;
          if (attachments.length > 0) {
            const body: UploadExpenseDocumentsBody = { files: attachments as Blob[] };
            uploadMutation.mutate(
              { id: newId, data: body },
              {
                onSuccess: () => {
                  toast({ title: "Voucher created", description: "Voucher and documents saved." });
                  setLocation(`/vouchers/${newId}`);
                },
                onError: () => {
                  toast({ title: "Voucher created", description: "Voucher saved; document upload failed.", variant: "destructive" });
                  setLocation(`/vouchers/${newId}`);
                },
              }
            );
          } else {
            toast({ title: "Voucher created", description: "Voucher has been saved successfully." });
            setLocation(`/vouchers/${newId}`);
          }
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const isPending = mutation.isPending || uploadMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href={backPath}>
          <Button variant="ghost" size="icon" data-testid="btn-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            {voucherType === "payment" ? "PECRU-PV series" : "PECRU-RV series"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-card border-border shadow-panel">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="projectId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Project</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-project"><SelectValue placeholder="Select project" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects?.data?.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="vendorId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Vendor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-vendor"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendors?.data?.filter(v => v.isActive).map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="expenseDate" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Expense Date</FormLabel>
                  <FormControl>
                    <Input type="date" data-testid="input-expense-date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Invoice Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" className="font-mono" data-testid="input-invoice-number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-panel">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Line Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="particularId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-bold">Particular</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-particular"><SelectValue placeholder="Select particular" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {particulars?.data?.map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="uomId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-bold">Unit of Measure</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-uom"><SelectValue placeholder="Select UOM" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {uoms?.data?.map(u => (
                          <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-bold">Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" min="0" placeholder="0" className="font-mono" data-testid="input-quantity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="pricePerUnit" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-bold">Price Per Unit (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" min="0" placeholder="0.00" className="font-mono" data-testid="input-price-per-unit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Total Amount</span>
                <span className="font-mono text-2xl font-bold text-primary" data-testid="computed-amount">₹{computedAmount}</span>
              </div>

              <FormField control={form.control} name="paymentStatusId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Payment Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses?.data?.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-panel">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description..." className="resize-none" rows={3} data-testid="input-description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="transactionDetails" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Transaction Details</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional transaction details..." className="resize-none font-mono" rows={3} data-testid="input-transaction-details" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-panel">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded border border-border bg-muted/20"
                      data-testid={`attachment-${i}`}>
                      <div className="flex items-center gap-2 text-sm">
                        <Upload className="w-4 h-4 text-primary" />
                        <span className="font-medium truncate max-w-[240px]">{file.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        type="button" onClick={() => removeAttachment(i)}
                        data-testid={`btn-remove-attachment-${i}`}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="text-sm text-muted-foreground file:mr-3 file:px-3 file:py-1 file:rounded file:border file:border-border file:text-xs file:font-bold file:uppercase file:tracking-wide file:bg-muted file:text-foreground"
                  data-testid="input-file-upload"
                />
              </div>
              <p className="text-xs text-muted-foreground">Accepted: PDF, JPG, PNG. Files will be uploaded after saving the voucher.</p>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href={backPath}>
              <Button variant="outline" type="button" data-testid="btn-cancel">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isPending} className="font-bold uppercase tracking-wide min-w-32" data-testid="btn-submit-voucher">
              {isPending ? (uploadMutation.isPending ? "Uploading..." : "Saving...") : "Create Voucher"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
