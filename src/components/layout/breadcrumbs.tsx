"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/dashboard" className="flex items-center hover:text-foreground" aria-label="Dashboard home">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((seg, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
        return (
          <Fragment key={href}>
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground" aria-current="page">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground">{label}</Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
