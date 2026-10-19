import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/rbac";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();

  // Belt-and-suspenders: middleware already protects this route group, but
  // Server Components should never trust the client — re-verify here too.
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;

  return (
    <DashboardShell permissions={user.permissions ?? []} userName={user.name ?? "User"} roleName={user.roleName ?? ""}>
      {children}
    </DashboardShell>
  );
}
