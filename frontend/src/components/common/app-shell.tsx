"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/common/app-header";
import { DockRail } from "@/components/common/dock-rail";
import { NavPanel } from "@/components/common/nav-panel";
import { useAppShellStore } from "@/stores/app-shell-store";
import { useChatRealtime } from "@/features/chats";

/**
 * Khung ứng dụng: dock icon + panel menu con + header, nội dung nằm trong card bo góc.
 * Desktop: panel ẩn/hiện bằng nút ở header; mobile: dock + panel mở dạng overlay.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const panelOpen = useAppShellStore((s) => s.panelOpen);
  const mobileOpen = useAppShellStore((s) => s.mobileOpen);
  const setMobileOpen = useAppShellStore((s) => s.setMobileOpen);
  const setSelectedRootId = useAppShellStore((s) => s.setSelectedRootId);
  // Sidebar hội thoại + badge chưa đọc luôn đúng dù đang ở trang nào
  useChatRealtime();

  // Điều hướng xong: menu gốc lại theo route, đóng overlay mobile
  React.useEffect(() => {
    setSelectedRootId(null);
    setMobileOpen(false);
  }, [pathname, setSelectedRootId, setMobileOpen]);

  return (
    <div className="flex h-dvh gap-2 bg-background p-2">
      <div className="hidden md:flex">
        <DockRail />
      </div>

      <div
        className={cn(
          "hidden overflow-hidden transition-[width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none md:block",
          panelOpen ? "w-64 opacity-100" : "w-0 opacity-0",
        )}
        aria-hidden={!panelOpen}
        inert={!panelOpen}
      >
        <NavPanel />
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
        >
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
          />
          <div className="relative flex h-full w-fit gap-2 p-2 animate-in slide-in-from-left duration-300">
            <DockRail />
            <NavPanel />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Đóng menu"
              className="absolute -right-10 top-4 flex size-9 items-center justify-center rounded-full bg-card text-foreground shadow-md"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <AppHeader />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
