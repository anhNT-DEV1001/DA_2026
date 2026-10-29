"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Command, Menu, PanelLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { NavUser } from "@/components/common/nav-user";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MenuIcon, useAppNavigation } from "@/features/menus";
import { NotificationBell } from "@/features/notifications";
import { useAppShellStore } from "@/stores/app-shell-store";

const iconButton =
  "relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary";

// TODO: cấu hình command palette (tìm task, tài liệu, chạy lệnh)
function openCommandPalette() {
  toast.add({
    title: "Tìm kiếm nhanh",
    description: "Tính năng đang được phát triển.",
    type: "info",
  });
}

export function AppHeader() {
  const { breadcrumb } = useAppNavigation();
  const togglePanel = useAppShellStore((s) => s.togglePanel);
  const setMobileOpen = useAppShellStore((s) => s.setMobileOpen);

  // Ctrl/⌘ + K mở tìm kiếm nhanh
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openCommandPalette();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 md:px-4">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Mở menu"
        className={cn(iconButton, "md:hidden")}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <Tooltip>
        <TooltipTrigger
          onClick={togglePanel}
          aria-label="Ẩn/hiện thanh bên"
          className={cn(iconButton, "hidden md:flex")}
        >
          <PanelLeft className="size-[18px]" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="bottom">Ẩn/hiện thanh bên</TooltipContent>
      </Tooltip>

      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-1 text-sm">
          {breadcrumb.map((item, index) => {
            const isLast = index === breadcrumb.length - 1;
            return (
              <React.Fragment key={`${item.label}-${index}`}>
                {index > 0 && (
                  <li
                    aria-hidden="true"
                    className="hidden text-muted-foreground sm:block"
                  >
                    <ChevronRight className="size-4" />
                  </li>
                )}
                <li className={cn("min-w-0", !isLast && "hidden sm:block")}>
                  {isLast ? (
                    <span
                      aria-current="page"
                      className="flex items-center gap-1.5 rounded-md px-1.5 py-1 font-semibold"
                    >
                      <MenuIcon
                        name={item.icon}
                        className="size-4 shrink-0 text-primary"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                  ) : item.href ? (
                    <Link
                      href={item.href}
                      className="block truncate rounded-md px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="block truncate px-1.5 py-1 text-muted-foreground">
                      {item.label}
                    </span>
                  )}
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      </nav>

      <button
        type="button"
        onClick={openCommandPalette}
        className="mx-auto hidden h-9 w-full max-w-md cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 lg:flex"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="flex-1 text-left">
          Tìm task, tài liệu hoặc chạy lệnh...
        </span>
        <kbd className="flex items-center gap-0.5 rounded-md border border-border bg-card px-1.5 py-0.5 font-sans text-[11px] font-medium">
          <Command className="size-3" aria-hidden="true" />
          <span className="sr-only">Command</span>K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1 lg:ml-0">
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Tìm kiếm"
          className={cn(iconButton, "lg:hidden")}
        >
          <Search className="size-[18px]" aria-hidden="true" />
        </button>
        <ThemeToggle />
        <NotificationBell />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
        <NavUser />
      </div>
    </header>
  );
}
