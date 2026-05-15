import { useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListVendors,
  useCreateVendor,
  useUpdateVendor,
  useToggleVendorActive,
  getListVendorsQueryKey,
} from "@/api-client";
import type { Vendor } from "@/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, ChevronLeft, ChevronRight, Search, ToggleLeft, ToggleRight } from "lucide-react";

const PAGE_SIZE = 20;
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface VendorFormProps {
  form: UseFormReturn<FormValues>;
  onSubmit: (v: FormValues) => void;
  onCancel: () => void;
  submitLabel: string;
  submitting: boolean;
}

function VendorForm({ form, onSubmit, onCancel, submitLabel, submitting }: VendorFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs uppercase tracking-wider font-bold">Vendor Name *</FormLabel>
            <FormControl><Input data-testid="input-vendor-name" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="contactPerson" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider font-bold">Contact Person</FormLabel>
              <FormControl><Input placeholder="Optional" data-testid="input-contact-person" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider font-bold">Phone</FormLabel>
              <FormControl><Input placeholder="Optional" className="font-mono" data-testid="input-phone" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs uppercase tracking-wider font-bold">Email</FormLabel>
            <FormControl><Input type="email" placeholder="Optional" data-testid="input-email" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs uppercase tracking-wider font-bold">Address</FormLabel>
            <FormControl><Input placeholder="Optional" data-testid="input-address" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel} data-testid="btn-cancel">Cancel</Button>
          <Button type="submit" disabled={submitting} className="font-bold uppercase tracking-wide" data-testid="btn-confirm">
            {submitting ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function buildVendorData(values: FormValues) {
  return {
    name: values.name,
    ...(values.contactPerson ? { contactPerson: values.contactPerson } : {}),
    ...(values.phone ? { phone: values.phone } : {}),
    ...(values.email ? { email: values.email } : {}),
    ...(values.address ? { address: values.address } : {}),
  };
}

export default function Vendors() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Vendor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListVendors({ search: search || undefined, page, limit: PAGE_SIZE });
  const create = useCreateVendor();
  const update = useUpdateVendor();
  const toggle = useToggleVendorActive();

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE));

  const addForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", contactPerson: "", phone: "", email: "", address: "" },
  });
  const editForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", contactPerson: "", phone: "", email: "", address: "" },
  });

  function openEdit(v: Vendor) {
    setEditItem(v);
    editForm.reset({
      name: v.name,
      contactPerson: v.contactPerson ?? "",
      phone: v.phone ?? "",
      email: v.email ?? "",
      address: v.address ?? "",
    });
  }

  function handleAdd(values: FormValues) {
    setSubmitting(true);
    create.mutate({ data: buildVendorData(values) }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
        toast({ title: "Vendor added" });
        setAddOpen(false);
        addForm.reset();
        setSubmitting(false);
      },
      onError: (e) => {
        toast({ title: "Error", description: e.message, variant: "destructive" });
        setSubmitting(false);
      },
    });
  }

  function handleEdit(values: FormValues) {
    if (!editItem) return;
    setSubmitting(true);
    update.mutate({ id: editItem.id, data: buildVendorData(values) }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
        toast({ title: "Vendor updated" });
        setEditItem(null);
        setSubmitting(false);
      },
      onError: (e) => {
        toast({ title: "Error", description: e.message, variant: "destructive" });
        setSubmitting(false);
      },
    });
  }

  function handleToggle(id: number) {
    toggle.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
        toast({ title: "Status updated" });
      },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">Vendors</h1>
        <Button className="gap-2 font-bold uppercase tracking-wide" onClick={() => { addForm.reset(); setAddOpen(true); }} data-testid="btn-add-vendor">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." className="pl-9" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            data-testid="input-search-vendors" />
        </div>
      </div>

      <Card className="bg-card border-border shadow-panel">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !data?.data?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm uppercase tracking-widest font-bold">No vendors found</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm" data-testid="table-vendors">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Name</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Contact</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Phone</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((v: Vendor) => (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      data-testid={`row-vendor-${v.id}`}>
                      <td className="px-4 py-3 font-medium">{v.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{v.contactPerson ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{v.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={v.isActive ? "default" : "outline"} data-testid={`status-vendor-${v.id}`}>
                          {v.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)} data-testid={`btn-edit-${v.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(v.id)} data-testid={`btn-toggle-${v.id}`}>
                            {v.isActive ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground font-mono">{data.total} total · page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="btn-prev-page">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="btn-next-page">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="uppercase tracking-wide font-bold">Add Vendor</DialogTitle></DialogHeader>
          <VendorForm form={addForm} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} submitLabel="Add Vendor" submitting={submitting} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="uppercase tracking-wide font-bold">Edit Vendor</DialogTitle></DialogHeader>
          <VendorForm form={editForm} onSubmit={handleEdit} onCancel={() => setEditItem(null)} submitLabel="Save Changes" submitting={submitting} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
