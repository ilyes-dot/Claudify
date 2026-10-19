"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/users/confirm-dialog";

interface Category { id: string; name: string; slug: string; description: string | null; _count: { products: number } }

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function CategoriesManager({ canCreate, canUpdate, canDelete }: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories.");
      return res.json() as Promise<{ categories: Category[] }>;
    },
  });

  const openCreate = () => { setEditing(null); setName(""); setSlug(""); setDescription(""); setFormOpen(true); };
  const openEdit = (cat: Category) => { setEditing(cat); setName(cat.name); setSlug(cat.slug); setDescription(cat.description ?? ""); setFormOpen(true); };

  const save = async () => {
    setSaving(true);
    try {
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug, description }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save category.");
      toast({ title: editing ? "Category updated" : "Category created", variant: "success" });
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/categories/${deleting.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete category.");
      toast({ title: "Category deleted", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add category</Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10"><Tag className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                  </div>
                </div>
                <Badge variant="secondary">{cat._count.products} items</Badge>
              </div>
              {cat.description && <p className="mt-2 text-sm text-muted-foreground">{cat.description}</p>}
              <div className="mt-3 flex gap-2">
                {canUpdate && <Button size="sm" variant="outline" onClick={() => openEdit(cat)}><Pencil className="h-3 w-3" /> Edit</Button>}
                {canDelete && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(cat)}><Trash2 className="h-3 w-3" /> Delete</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
        {data?.categories.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No categories yet — create your first one.</p>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
            <DialogDescription>Categories help organize and filter your product catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="catName">Name</Label>
              <Input id="catName" value={name} onChange={(e) => { setName(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catSlug">Slug</Label>
              <Input id="catSlug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catDesc">Description</Label>
              <Input id="catDesc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !name || !slug}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete category?" description={`"${deleting?.name}" will be removed. Categories with assigned products cannot be deleted.`}
        confirmLabel="Delete category" variant="destructive" onConfirm={handleDelete}
      />
    </div>
  );
}
