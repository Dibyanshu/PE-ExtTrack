import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface MasterItem {
  id: number;
  name: string;
  createdAt?: string;
}

interface MasterPageProps {
  title: string;
  items?: MasterItem[];
  total?: number;
  isLoading: boolean;
  page: number;
  setPage: (p: number) => void;
  search: string;
  setSearch: (s: string) => void;
  queryKey: readonly unknown[];
  onAdd: (name: string) => Promise<void>;
  onEdit: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const PAGE_SIZE = 20;

export function MasterPage({
  title, items, total, isLoading,
  page, setPage, search, setSearch,
  onAdd, onEdit, onDelete,
}: MasterPageProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<MasterItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MasterItem | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));

  async function handleAdd() {
    if (!inputValue.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(inputValue.trim());
      toast({ title: "Added", description: `${title} item added.` });
      setAddOpen(false);
      setInputValue("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An error occurred";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  async function handleEdit() {
    if (!editItem || !inputValue.trim()) return;
    setSubmitting(true);
    try {
      await onEdit(editItem.id, inputValue.trim());
      toast({ title: "Updated", description: `${title} item updated.` });
      setEditItem(null);
      setInputValue("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An error occurred";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setSubmitting(true);
    try {
      await onDelete(deleteItem.id);
      toast({ title: "Deleted", description: `${title} item deleted.` });
      setDeleteItem(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An error occurred";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">{title}</h1>
        <Button className="gap-2 font-bold uppercase tracking-wide" onClick={() => { setInputValue(""); setAddOpen(true); }}
          data-testid={`btn-add-${title.toLowerCase().replace(/\s+/g,'-')}`}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            data-testid={`input-search-${title.toLowerCase().replace(/\s+/g,'-')}`} />
        </div>
      </div>

      <Card className="bg-card border-border shadow-panel">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !items?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm uppercase tracking-widest font-bold">No items found</p>
              <p className="text-xs mt-2">Add your first {title.toLowerCase()} item</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm" data-testid={`table-${title.toLowerCase().replace(/\s+/g,'-')}`}>
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">ID</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Name</th>
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-bold">Created</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      data-testid={`row-master-${item.id}`}>
                      <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{item.id}</td>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => { setEditItem(item); setInputValue(item.name); }}
                            data-testid={`btn-edit-${item.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteItem(item)}
                            data-testid={`btn-delete-${item.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground font-mono">{total} total · page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8"
                    disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="btn-prev-page">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8"
                    disabled={page >= totalPages} onClick={() => setPage(page + 1)} data-testid="btn-next-page">
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
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide font-bold">Add {title}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Name" value={inputValue} onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            data-testid="input-add-name" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="btn-cancel-add">Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting || !inputValue.trim()} className="font-bold uppercase tracking-wide"
              data-testid="btn-confirm-add">
              {submitting ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide font-bold">Edit {title}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Name" value={inputValue} onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleEdit()}
            data-testid="input-edit-name" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} data-testid="btn-cancel-edit">Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting || !inputValue.trim()} className="font-bold uppercase tracking-wide"
              data-testid="btn-confirm-edit">
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={open => !open && setDeleteItem(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide font-bold">Delete {title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{deleteItem?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)} data-testid="btn-cancel-delete">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}
              className="font-bold uppercase tracking-wide" data-testid="btn-confirm-delete">
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
