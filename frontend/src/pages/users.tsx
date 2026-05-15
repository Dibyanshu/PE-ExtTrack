import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useToggleUserActive,
  getListUsersQueryKey,
} from "@/api-client";
import type {
  UserRecord,
  ListUsers200,
  CreateUserRequestRole,
  UpdateUserRequestRole,
} from "@/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";

const ROLES = ["expense_entry", "accounts", "admin", "superadmin"] as const;
type AppRole = typeof ROLES[number];

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "At least 6 characters"),
  role: z.enum(ROLES),
  canViewHistory: z.boolean(),
});

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(ROLES),
  canViewHistory: z.boolean(),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

const roleBadgeVariant: Record<AppRole, "default" | "secondary" | "outline" | "destructive"> = {
  superadmin: "destructive",
  admin: "default",
  accounts: "secondary",
  expense_entry: "outline",
};

export default function Users() {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<UserRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: usersResp, isLoading } = useListUsers();
  const create = useCreateUser();
  const update = useUpdateUser();
  const toggle = useToggleUserActive();

  const addForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", password: "", role: "expense_entry", canViewHistory: false },
  });

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", email: "", role: "expense_entry", canViewHistory: false },
  });

  function openEdit(u: UserRecord) {
    setEditItem(u);
    editForm.reset({
      name: u.name,
      email: u.email,
      role: u.role as AppRole,
      canViewHistory: !!u.canViewHistory,
    });
  }

  function handleCreate(values: CreateValues) {
    setSubmitting(true);
    create.mutate({
      data: {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role as CreateUserRequestRole,
        canViewHistory: values.canViewHistory,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User created" });
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

  function handleEdit(values: EditValues) {
    if (!editItem) return;
    setSubmitting(true);
    update.mutate({
      id: editItem.id,
      data: {
        name: values.name,
        email: values.email,
        role: values.role as UpdateUserRequestRole,
        canViewHistory: values.canViewHistory,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User updated" });
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
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User status updated" });
      },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  const users: UserRecord[] = (usersResp as ListUsers200 | undefined)?.data ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">Users</h1>
        <Button className="gap-2 font-bold uppercase tracking-wide" onClick={() => { addForm.reset(); setAddOpen(true); }} data-testid="btn-add-user">
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      <Card className="bg-card border-border shadow-panel">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !users.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm uppercase tracking-widest font-bold">No users found</p>
            </div>
          ) : (
            <table className="w-full text-sm" data-testid="table-users">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Name</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Email</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Role</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">History</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Active</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: UserRecord) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors" data-testid={`row-user-${u.id}`}>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={roleBadgeVariant[u.role as AppRole] ?? "outline"} data-testid={`badge-role-${u.id}`}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.canViewHistory ? <span className="text-primary font-semibold">Yes</span> : "No"}
                    </td>
                    <td className="px-4 py-3">
                      <Switch checked={!!u.isActive} onCheckedChange={() => handleToggle(u.id)} data-testid={`toggle-user-${u.id}`} />
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)} data-testid={`btn-edit-${u.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="uppercase tracking-wide font-bold">Add User</DialogTitle></DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleCreate)} className="space-y-4">
              <FormField control={addForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Full Name</FormLabel>
                  <FormControl><Input data-testid="input-user-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={addForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Email</FormLabel>
                  <FormControl><Input type="email" data-testid="input-user-email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={addForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Password</FormLabel>
                  <FormControl><Input type="password" data-testid="input-user-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={addForm.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={addForm.control} name="canViewHistory" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Can View History</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-can-view-history" /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setAddOpen(false)} data-testid="btn-cancel-add">Cancel</Button>
                <Button type="submit" disabled={submitting} className="font-bold uppercase tracking-wide" data-testid="btn-confirm-add">
                  {submitting ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="uppercase tracking-wide font-bold">Edit User</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Full Name</FormLabel>
                  <FormControl><Input data-testid="input-edit-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Email</FormLabel>
                  <FormControl><Input type="email" data-testid="input-edit-email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-edit-role"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="canViewHistory" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Can View History</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-edit-history" /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditItem(null)} data-testid="btn-cancel-edit">Cancel</Button>
                <Button type="submit" disabled={submitting} className="font-bold uppercase tracking-wide" data-testid="btn-confirm-edit">
                  {submitting ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
