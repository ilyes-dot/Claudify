"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { passwordSchema } from "@/lib/validations/user";

const formSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  roleId: z.string().min(1, "Select a role."),
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED", "DISABLED"]),
  password: z.union([passwordSchema, z.literal("")]).optional(),
  sendMode: z.enum(["invite", "manual"]),
});
type FormValues = z.infer<typeof formSchema>;

interface Role { id: string; name: string }
interface EditingUser {
  id: string; name: string; email: string; status: FormValues["status"];
  role: { id: string; name: string };
}

export function UserFormDialog({
  open, onOpenChange, roles, editingUser, onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  editingUser: EditingUser | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!editingUser;

  const {
    register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", roleId: "", status: "INVITED", password: "", sendMode: "invite" },
  });

  const sendMode = watch("sendMode");

  useEffect(() => {
    if (open) {
      reset(
        editingUser
          ? { name: editingUser.name, email: editingUser.email, roleId: editingUser.role.id, status: editingUser.status, password: "", sendMode: "invite" }
          : { name: "", email: "", roleId: roles[0]?.id ?? "", status: "INVITED", password: "", sendMode: "invite" }
      );
    }
  }, [open, editingUser, reset, roles]);

  const onSubmit = async (values: FormValues) => {
    if (!isEditing && values.sendMode === "manual" && !values.password) {
      toast({ title: "Password required", description: "Enter a temporary password, or switch to email invite.", variant: "destructive" });
      return;
    }

    try {
      const url = isEditing ? `/api/users/${editingUser!.id}` : "/api/users";
      const method = isEditing ? "PATCH" : "POST";
      const payload = isEditing
        ? { name: values.name, roleId: values.roleId, status: values.status }
        : {
            name: values.name,
            email: values.email,
            roleId: values.roleId,
            status: values.status,
            password: values.sendMode === "manual" ? values.password : undefined,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");

      const inviteNote = !isEditing && values.sendMode === "invite"
        ? body.inviteEmailSent
          ? " An invite email was sent."
          : " Email isn't configured yet (RESEND_API_KEY) — check the server logs for the invite link."
        : "";

      toast({
        title: isEditing ? "User updated" : "User created",
        description: isEditing ? `${values.name}'s account was updated.` : `${values.name} has been added.${inviteNote}`,
        variant: "success",
      });
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
          <DialogTitle>{isEditing ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this user's role and status." : "Invite a new user and assign their role."}
          </DialogDescription>
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
            {isEditing && <p className="text-xs text-muted-foreground">Email cannot be changed after creation.</p>}
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label>How should they get access?</Label>
              <div className="flex gap-2">
                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input type="radio" value="invite" {...register("sendMode")} className="accent-primary" />
                  Email invite link
                </label>
                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input type="radio" value="manual" {...register("sendMode")} className="accent-primary" />
                  Set password myself
                </label>
              </div>

              {sendMode === "invite" ? (
                <p className="text-xs text-muted-foreground">
                  They&apos;ll receive an email with a link to set their own password. The link expires in 24 hours.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="password">Temporary password</Label>
                  <Input id="password" type="password" error={!!errors.password} {...register("password")} />
                  <p className="text-xs text-muted-foreground">
                    User will be required to change this on first login. Min 12 chars, mixed case, number, symbol.
                  </p>
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roleId">Role</Label>
              <Controller
                control={control}
                name="roleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="roleId"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.roleId && <p className="text-sm text-destructive">{errors.roleId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INVITED">Invited</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="DISABLED">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
