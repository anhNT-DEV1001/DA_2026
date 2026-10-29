"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickTools } from "@/components/common/quick-tools";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MenuIcon, menuHref, useAppNavigation } from "@/features/menus";
import { useAppShellStore } from "@/stores/app-shell-store";

// size-10 (40px) + gap-2 (8px) giữa các item
const ITEM_STEP_PX = 48;

/**
 * Cột icon bên trái: menu gốc lấy từ DB (đã lọc quyền xem).
 * Menu có menu con -> chọn và mở panel; menu lá -> điều hướng thẳng.
 */
export function DockRail() {
  const router = useRouter();
  const { rootMenus, activeRoot, isLoading } = useAppNavigation();
  const panelOpen = useAppShellStore((s) => s.panelOpen);
  const setPanelOpen = useAppShellStore((s) => s.setPanelOpen);
  const setSelectedRootId = useAppShellStore((s) => s.setSelectedRootId);

  const activeIndex = rootMenus.findIndex((m) => m.id === activeRoot?.id);

  const handleSelect = (id: number) => {
    const menu = rootMenus.find((m) => m.id === id);
    if (!menu) return;
    const href = menuHref(menu.route);

    if (!menu.children?.length && href) {
      setSelectedRootId(id);
      router.push(href);
      return;
    }
    // Bấm lại menu đang chọn -> ẩn/hiện panel
    if (activeRoot?.id === id) {
      setPanelOpen(!panelOpen);
    } else {
      setSelectedRootId(id);
      setPanelOpen(true);
    }
  };

  return (
    <nav
      aria-label="Điều hướng chính"
      className="flex h-full w-16 shrink-0 flex-col items-center rounded-2xl border border-border bg-dock py-3 text-dock-foreground"
    >
      <Link
        href="/"
        className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/40 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Command className="size-5" aria-hidden="true" />
        <span className="sr-only">Trang chủ ứng dụng</span>
      </Link>

      <div className="my-4 h-px w-8 bg-dock-muted" aria-hidden="true" />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="size-10 rounded-xl bg-dock-muted" />
          ))}
        </div>
      ) : (
        <ul className="relative flex flex-col gap-2">
          {activeIndex >= 0 && (
            <>
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 size-10 rounded-xl bg-dock-muted transition-transform duration-300 ease-out"
                style={{
                  transform: `translateY(${activeIndex * ITEM_STEP_PX}px)`,
                }}
              />
              <span
                aria-hidden="true"
                className="absolute -left-3 top-2.5 h-5 w-1 rounded-r-full bg-primary transition-transform duration-300 ease-out"
                style={{
                  transform: `translateY(${activeIndex * ITEM_STEP_PX}px)`,
                }}
              />
            </>
          )}
          {rootMenus.map((menu) => {
            const isActive = menu.id === activeRoot?.id;
            return (
              <li key={menu.id}>
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => handleSelect(menu.id)}
                    aria-label={menu.name}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex size-10 cursor-pointer items-center justify-center rounded-xl transition-colors hover:text-dock-active focus-visible:outline-2 focus-visible:outline-primary",
                      isActive && "text-dock-active",
                    )}
                  >
                    <MenuIcon name={menu.icon} className="size-5" />
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {menu.name}
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      )}

      {/* Thanh công cụ nhanh: Ghi chú, AI... */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <QuickTools />
      </div>
    </nav>
  );
}
