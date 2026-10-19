"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingCart,
  Users as UsersIcon,
  Users,
  ShieldCheck,
  ScrollText,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string; // permission key required to see this item
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { label: "Products", href: "/products", icon: Package, permission: "products:view" },
  { label: "Categories", href: "/categories", icon: Tag, permission: "categories:view" },
  { label: "Orders", href: "/orders", icon: ShoppingCart, permission: "orders:view" },
  { label: "Customers", href: "/customers", icon: UsersIcon, permission: "customers:view" },
  { label: "Admin Users", href: "/users", icon: Users, permission: "users:view" },
  { label: "Roles & Permissions", href: "/roles", icon: ShieldCheck, permission: "roles:view" },
  { label: "Audit Logs", href: "/audit-logs", icon: ScrollText, permission: "audit-logs:view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings:view" },
];

interface SidebarProps {
  permissions: string[];
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ permissions, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission));

  const content = (
    <nav aria-label="Main navigation" className="flex h-full flex-col gap-1 p-3">
      <div className="flex items-center justify-between px-2 py-3">
        <span className="text-lg font-bold tracking-tight">Shop Admin Panel</span>
        <button
          className="rounded-md p-1 hover:bg-accent lg:hidden"
          onClick={onMobileClose}
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {visibleItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onMobileClose}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop: static sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">{content}</aside>

      {/* Mobile: overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} aria-hidden="true" />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}
