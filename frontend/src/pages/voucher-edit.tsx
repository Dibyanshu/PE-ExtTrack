import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetExpense,
  useUpdateExpense,
  useListParticulars,
  useListUom,
  useListPaymentStatuses,
  getGetExpenseQueryKey,
  getListExpensesQueryKey,
} from "@/api-client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const editSchema = z.object({
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

type EditFormValues = z.infer<typeof editSchema>;

export default function VoucherEdit() {
  const [, params] = useRoute("/vouchers/:id/edit");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenseResp, isLoading, isError } = useGetExpense(id, {
    query: { enabled: !!id, queryKey: getGetExpenseQueryKey(id) },
  });
  const { data: particulars } = useListParticulars({ limit: 200 });
  const { data: uoms } = useListUom({ limit: 200 });
  const { data: statuses } = useListPaymentStatuses({ limit: 200 });

  const updateMutation = useUpdateExpense();

  const expense = expenseResp?.data;

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      expenseDate: "", particularId: "", uomId: "",
      quantity: "", pricePerUnit: "", paymentStatusId: "",
      invoiceNumber: "", description: "", transactionDetails: "",
    },
  });

  useEffect(() => {
    if (expense) {
      form.reset({
        expenseDate: expense.expenseDate,
        particularId: String(expense.particularId),
        uomId: String(expense.uomId),
        quantity: expense.quantity,
        pricePerUnit: expense.pricePerUnit,
        paymentStatusId: String(expense.paymentStatusId),
        invoiceNumber: expense.invoiceNumber || "",
        description: expense.description || "",
        transactionDetails: expense.transactionDetails || "",
      });
    }
  }, [expense, form]);

  const qty = Number(form.watch("quantity") || 0);
  const ppu = Number(form.watch("pricePerUnit") || 0);
  const computedAmount = (qty * ppu).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  function onSubmit(values: EditFormValues) {
    updateMutation.mutate({
      id,
      data: {
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
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetExpenseQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        toast({ title: "Voucher updated", description: "Changes saved successfully." });
        setLocation(`/vouchers/${id}`);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
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

  if (expense.finalizedAt) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Cannot Edit</AlertTitle>
        <AlertDescription>This voucher has been finalized and cannot be edited.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href={`/vouchers/${id}`}>
          <Button variant="ghost" size="icon" data-testid="btn-back"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">Edit Voucher</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">{expense.voucherNumber}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-card border-border shadow-panel">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Line Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="expenseDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-bold">Expense Date</FormLabel>
                    <FormControl><Input type="date" data-testid="input-expense-date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-bold">Invoice Number</FormLabel>
                    <FormControl><Input placeholder="Optional" className="font-mono" data-testid="input-invoice-number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="particularId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-bold">Particular</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-particular"><SelectValue /></SelectTrigger></FormControl>
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
                      <FormControl><SelectTrigger data-testid="select-uom"><SelectValue /></SelectTrigger></FormControl>
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
                    <FormControl><Input type="number" step="any" min="0" className="font-mono" data-testid="input-quantity" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="pricePerUnit" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-bold">Price Per Unit (₹)</FormLabel>
                    <FormControl><Input type="number" step="any" min="0" className="font-mono" data-testid="input-price-per-unit" {...field} /></FormControl>
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
                    <FormControl><SelectTrigger data-testid="select-payment-status"><SelectValue /></SelectTrigger></FormControl>
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
                  <FormControl><Textarea placeholder="Optional..." className="resize-none" rows={3} data-testid="input-description" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="transactionDetails" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Transaction Details</FormLabel>
                  <FormControl><Textarea placeholder="Optional..." className="resize-none font-mono" rows={3} data-testid="input-transaction-details" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href={`/vouchers/${id}`}>
              <Button variant="outline" type="button" data-testid="btn-cancel">Cancel</Button>
            </Link>
            <Button type="submit" disabled={updateMutation.isPending} className="font-bold uppercase tracking-wide min-w-32" data-testid="btn-submit-edit">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
