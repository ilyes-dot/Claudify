"use client";

import { Menu, LogOut, UserCircle, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
  userName: string;
  roleName: string;
}

export function Header({ onMenuClick, userName, roleName }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open navigation menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationsMenu />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent" aria-label="Account menu">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {getInitials(userName || "User")}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs text-muted-foreground">{roleName}</p>
              </div>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" className="z-50 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
              <DropdownMenu.Item asChild>
                <a href="/account/profile" className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                  <UserCircle className="h-4 w-4" /> Profile
                </a>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <a href="/settings" className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                  <Settings className="h-4 w-4" /> Settings
                </a>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={() => signOut({ callbackUrl: "/login" })}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
