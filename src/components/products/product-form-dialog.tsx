"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is too short."),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only."),
  sku: z.string().trim().optional(),
  price: z.coerce.number().positive("Price must be greater than 0."),
  stock: z.coerce.number().int().min(0, "Cannot be negative."),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  categoryId: z.string().optional(),
  description: z.string().trim().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface Category { id: string; name: string }

export function ProductFormDialog({
  open, onOpenChange, categories, editingProduct, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; categories: Category[]; editingProduct: any | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const isEditing = !!editingProduct;

  const {
    register, handleSubmit, control, reset, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", slug: "", sku: "", price: 0, stock: 0, status: "DRAFT", categoryId: "", description: "" },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (open) {
      reset(
        editingProduct
          ? {
              name: editingProduct.name, slug: editingProduct.slug, sku: editingProduct.sku ?? "",
              price: Number(editingProduct.price), stock: editingProduct.stock, status: editingProduct.status,
              categoryId: editingProduct.category?.id ?? "", description: editingProduct.description ?? "",
            }
          : { name: "", slug: "", sku: "", price: 0, stock: 0, status: "DRAFT", categoryId: "", description: "" }
      );
    }
  }, [open, editingProduct, reset]);

  // Auto-generate the slug from the name while creating a new product,
  // unless the admin has already started typing their own slug.
  const onNameBlur = () => {
    if (!isEditing) setValue("slug", slugify(nameValue || ""));
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const url = isEditing ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = isEditing ? "PATCH" : "POST";
      const payload = { ...values, categoryId: values.categoryId || null, sku: values.sku || undefined };

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");

      toast({ title: isEditing ? "Product updated" : "Product created", description: values.name, variant: "success" });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>{isEditing ? "Update product details, pricing, and stock." : "Add a new product to your catalog."}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" error={!!errors.name} {...register("name")} onBlur={onNameBlur} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" error={!!errors.slug} {...register("slug")} />
            {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input id="price" type="number" step="0.01" error={!!errors.price} {...register("price")} />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" error={!!errors.stock} {...register("stock")} />
              {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU (optional)</Label>
              <Input id="sku" {...register("sku")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller control={control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Controller control={control} name="categoryId" render={({ field }) => (
              <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                <SelectTrigger id="categoryId"><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea id="description" rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
