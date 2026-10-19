"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

interface DashboardShellProps {
  children: React.ReactNode;
  permissions: string[];
  userName: string;
  roleName: string;
}

export function DashboardShell({ children, permissions, userName, roleName }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar permissions={permissions} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} userName={userName} roleName={roleName} />
        <main id="main-content" className="flex-1 space-y-4 p-4 lg:p-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
