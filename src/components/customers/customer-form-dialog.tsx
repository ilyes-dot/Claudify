"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is too short."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function CustomerFormDialog({
  open, onOpenChange, editingCustomer, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; editingCustomer: any | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const isEditing = !!editingCustomer;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", phone: "", city: "", country: "" },
  });

  useEffect(() => {
    if (open) {
      reset(editingCustomer
        ? { name: editingCustomer.name, email: editingCustomer.email, phone: editingCustomer.phone ?? "", city: editingCustomer.city ?? "", country: editingCustomer.country ?? "" }
        : { name: "", email: "", phone: "", city: "", country: "" });
    }
  }, [open, editingCustomer, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const url = isEditing ? `/api/customers/${editingCustomer.id}` : "/api/customers";
      const method = isEditing ? "PATCH" : "POST";
      const payload = isEditing ? { name: values.name, phone: values.phone, city: values.city, country: values.country } : values;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");

      toast({ title: isEditing ? "Customer updated" : "Customer added", description: values.name, variant: "success" });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogDescription>{isEditing ? "Update contact details." : "Add a new customer record."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" error={!!errors.name} {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" disabled={isEditing} error={!!errors.email} {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
