"use client";

import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { NotificationsNav } from "@/components/common/notifications-nav";
import { NavUser } from "@/components/common/nav-user";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 w-full min-w-0 shrink-0 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationsNav />
        <NavUser />
      </div>
    </header>
  );
}
