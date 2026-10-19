"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck, XCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordSchema } from "@/lib/validations/user";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

const formSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof formSchema>;

type TokenState = "checking" | "valid" | "invalid" | "success";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<TokenState>("checking");
  const [accountInfo, setAccountInfo] = useState<{ name?: string; email?: string }>({});

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    fetch(`/api/invite/verify?token=${encodeURIComponent(params.token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setAccountInfo({ name: data.name, email: data.email });
          setState("valid");
        } else {
          setState("invalid");
        }
      })
      .catch(() => setState("invalid"));
  }, [params.token]);

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, password: values.password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setState("success");
      toast({ title: "Password set", description: "You can now sign in.", variant: "success" });
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: any) {
      toast({ title: "Could not set password", description: err.message, variant: "destructive" });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {state === "invalid" ? (
              <XCircle className="h-6 w-6 text-destructive" />
            ) : state === "success" ? (
              <CheckCircle2 className="h-6 w-6 text-success" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle>
            {state === "invalid" ? "Invite link invalid" : state === "success" ? "You're all set" : "Welcome to Shop Admin Panel"}
          </CardTitle>
          <CardDescription>
            {state === "checking" && "Checking your invite link…"}
            {state === "valid" && `Set a password for ${accountInfo.email}`}
            {state === "invalid" && "This link has expired, already been used, or is invalid."}
            {state === "success" && "Redirecting you to sign in…"}
          </CardDescription>
        </CardHeader>

        {state === "valid" && (
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" error={!!errors.password} {...register("password")} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type="password" autoComplete="new-password" error={!!errors.confirmPassword} {...register("confirmPassword")} />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Set password & continue
              </Button>
            </form>
          </CardContent>
        )}

        {state === "invalid" && (
          <CardContent className="text-center">
            <Button asChild variant="outline">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
