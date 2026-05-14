import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";

const PAGE_SIZE = 20;
const schema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
});
type FormValues = z.infer<typeof schema>;

export default function Projects() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ id: number; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListProjects({ search: search || undefined, page, limit: PAGE_SIZE });
  const create = useCreateProject();
  const update = useUpdateProject();
  const remove = useDeleteProject();

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE));

  const addForm = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { code: "", name: "" } });
  const editForm = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { code: "", name: "" } });

  function openEdit(item: { id: number; code: string; name: string }) {
    setEditId(item.id);
    editForm.reset({ code: item.code, name: item.name });
  }

  function handleAdd(values: FormValues) {
    setSubmitting(true);
    create.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Project added" });
        setAddOpen(false);
        addForm.reset();
        setSubmitting(false);
      },
      onError: (e) => { toast({ title: "Error", description: e.message, variant: "destructive" }); setSubmitting(false); },
    });
  }

  function handleEdit(values: FormValues) {
    if (!editId) return;
    setSubmitting(true);
    update.mutate({ id: editId, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Project updated" });
        setEditId(null);
        setSubmitting(false);
      },
      onError: (e) => { toast({ title: "Error", description: e.message, variant: "destructive" }); setSubmitting(false); },
    });
  }

  function handleDelete() {
    if (!deleteItem) return;
    setSubmitting(true);
    remove.mutate({ id: deleteItem.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Project deleted" });
        setDeleteItem(null);
        setSubmitting(false);
      },
      onError: (e) => { toast({ title: "Error", description: e.message, variant: "destructive" }); setSubmitting(false); },
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">Projects</h1>
        <Button className="gap-2 font-bold uppercase tracking-wide" onClick={() => { addForm.reset(); setAddOpen(true); }}
          data-testid="btn-add-project">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            data-testid="input-search-projects" />
        </div>
      </div>

      <Card className="bg-card border-border shadow-panel">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !data?.data?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm uppercase tracking-widest font-bold">No projects found</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm" data-testid="table-projects">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Code</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Name</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Created</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map(item => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      data-testid={`row-project-${item.id}`}>
                      <td className="px-4 py-3 font-mono font-bold text-primary">{item.code}</td>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => openEdit(item)} data-testid={`btn-edit-${item.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteItem({ id: item.id, name: item.name })} data-testid={`btn-delete-${item.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="uppercase tracking-wide font-bold">Add Project</DialogTitle></DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAdd)} className="space-y-4">
              <FormField control={addForm.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Code</FormLabel>
                  <FormControl><Input placeholder="e.g. PROJ-001" className="font-mono" data-testid="input-project-code" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={addForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Name</FormLabel>
                  <FormControl><Input placeholder="Project name" data-testid="input-project-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setAddOpen(false)} data-testid="btn-cancel-add">Cancel</Button>
                <Button type="submit" disabled={submitting} className="font-bold uppercase tracking-wide" data-testid="btn-confirm-add">
                  {submitting ? "Adding..." : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={open => !open && setEditId(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="uppercase tracking-wide font-bold">Edit Project</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <FormField control={editForm.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Code</FormLabel>
                  <FormControl><Input className="font-mono" data-testid="input-edit-code" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-bold">Name</FormLabel>
                  <FormControl><Input data-testid="input-edit-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditId(null)} data-testid="btn-cancel-edit">Cancel</Button>
                <Button type="submit" disabled={submitting} className="font-bold uppercase tracking-wide" data-testid="btn-confirm-edit">
                  {submitting ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={open => !open && setDeleteItem(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="uppercase tracking-wide font-bold">Delete Project</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Delete <strong className="text-foreground">{deleteItem?.name}</strong>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)} data-testid="btn-cancel-delete">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting} className="font-bold uppercase tracking-wide" data-testid="btn-confirm-delete">
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
