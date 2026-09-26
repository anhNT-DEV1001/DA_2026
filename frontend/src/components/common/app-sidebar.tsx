"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Command, PanelLeftClose, Search, X } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuIcon, useSidebarMenus, type MenuItem } from "@/features/menus";

function MobileTreeNode({
  item,
  pathname,
  expandedIds,
  toggleExpand,
  onClose,
  depth = 0,
}: {
  item: MenuItem;
  pathname: string;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  onClose: () => void;
  depth?: number;
}) {
  const validChildren = React.useMemo(() => {
    if (!item.children) return [];
    return item.children
      .filter((c) => c.isActive !== false && c.isSideBarDisplay !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [item.children]);

  const hasChildren = validChildren.length > 0;
  const isExpanded = expandedIds.has(item.id);
  const isActive = item.route ? pathname === item.route : false;
  const isChildActive =
    hasChildren &&
    validChildren.some(
      (c) =>
        c.route && (pathname === c.route || pathname.startsWith(`${c.route}/`)),
    );

  if (hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => toggleExpand(item.id)}
          isActive={isActive || isChildActive}
          className={cn(
            "w-full justify-between cursor-pointer px-3 py-2",
            (isActive || isChildActive) && "font-medium text-foreground",
          )}
        >
          <div className="flex items-center gap-2.5 truncate">
            <MenuIcon name={item.icon} className="size-4 shrink-0" />
            <span className="truncate">{item.name}</span>
          </div>
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-90",
            )}
          />
        </SidebarMenuButton>

        {isExpanded && (
          <SidebarMenuSub className="my-1">
            {item.route && (
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  render={<Link href={item.route} />}
                  isActive={pathname === item.route}
                  onClick={onClose}
                  className="cursor-pointer"
                >
                  <span className="truncate text-xs text-muted-foreground">
                    Tổng quan {item.name}
                  </span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )}
            {validChildren.map((child) => (
              <MobileTreeNode
                key={child.id}
                item={child}
                pathname={pathname}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                onClose={onClose}
                depth={depth + 1}
              />
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  // Leaf node
  if (depth > 0) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          render={<Link href={item.route || "#"} />}
          isActive={isActive}
          onClick={onClose}
          className="cursor-pointer"
        >
          <MenuIcon name={item.icon} className="size-3.5 shrink-0" />
          <span className="truncate">{item.name}</span>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={item.route || "#"} />}
        isActive={isActive}
        onClick={onClose}
        className="w-full cursor-pointer px-3 py-2"
      >
        <MenuIcon name={item.icon} className="size-4 shrink-0" />
        <span className="truncate">{item.name}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function MobileTreeSidebar({
  menus,
  isLoading,
  pathname,
  onClose,
}: {
  menus: MenuItem[];
  isLoading: boolean;
  pathname: string;
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [expandedIds, setExpandedIds] = React.useState<Set<number>>(new Set());

  // Auto-expand parent của menu active hiện tại
  React.useEffect(() => {
    if (menus.length === 0) return;
    const activeIds = new Set<number>();
    const findActiveAncestors = (items: MenuItem[]) => {
      items.forEach((item) => {
        const isCurrentActive =
          item.route &&
          (pathname === item.route || pathname.startsWith(`${item.route}/`));
        const hasActiveChild = item.children?.some(
          (c) =>
            c.route &&
            (pathname === c.route || pathname.startsWith(`${c.route}/`)),
        );
        if (isCurrentActive || hasActiveChild) {
          activeIds.add(item.id);
        }
        if (item.children) {
          findActiveAncestors(item.children);
        }
      });
    };
    findActiveAncestors(menus);
    if (activeIds.size > 0) {
      setExpandedIds((prev) => new Set([...prev, ...activeIds]));
    }
  }, [menus, pathname]);

  const toggleExpand = React.useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Lọc theo tìm kiếm
  const filteredMenus = React.useMemo(() => {
    const filterItems = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter(
          (item) => item.isActive !== false && item.isSideBarDisplay !== false,
        )
        .filter((item) => {
          if (!searchTerm.trim()) return true;
          const term = searchTerm.trim().toLowerCase();
          const matchSelf = item.name.toLowerCase().includes(term);
          const matchChildren = item.children?.some((c) =>
            c.name.toLowerCase().includes(term),
          );
          return matchSelf || matchChildren;
        })
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    };
    return filterItems(menus);
  }, [menus, searchTerm]);

  // Khi tìm kiếm, tự động mở rộng các node có chứa kết quả
  React.useEffect(() => {
    if (!searchTerm.trim()) return;
    const term = searchTerm.trim().toLowerCase();
    const matchingIds = new Set<number>();
    menus.forEach((item) => {
      const matchChildren = item.children?.some((c) =>
        c.name.toLowerCase().includes(term),
      );
      if (matchChildren) {
        matchingIds.add(item.id);
      }
    });
    setExpandedIds((prev) => new Set([...prev, ...matchingIds]));
  }, [searchTerm, menus]);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header Mobile */}
      <SidebarHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-2.5 outline-none"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Command className="size-4" />
          </div>
          <div className="grid text-left text-sm leading-tight">
            <span className="truncate font-semibold">DA System</span>
            <span className="truncate text-xs text-muted-foreground">
              Enterprise
            </span>
          </div>
        </Link>

        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={onClose}
          title="Đóng menu"
        >
          <X className="size-4" />
          <span className="sr-only">Đóng menu</span>
        </Button>
      </SidebarHeader>

      {/* Tìm kiếm */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <SidebarInput
            placeholder="Tìm kiếm menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Danh sách tree menu */}
      <SidebarContent className="p-2">
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {isLoading ? (
              <div className="space-y-3 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-md" />
                ))}
              </div>
            ) : filteredMenus.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                {searchTerm
                  ? `Không tìm thấy menu "${searchTerm}"`
                  : "Không có menu nào"}
              </div>
            ) : (
              <SidebarMenu className="gap-1">
                {filteredMenus.map((item) => (
                  <MobileTreeNode
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    onClose={onClose}
                  />
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpen, isMobile, setOpenMobile } = useSidebar();

  const { data: sidebarMenus = [], isLoading } = useSidebarMenus();

  const [selectedMenuId, setSelectedMenuId] = React.useState<number | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isSubOpen, setIsSubOpen] = React.useState(true);

  // Tìm menu cha tương ứng với route hiện tại (dẫn xuất trực tiếp trong render)
  const matchedParentId = React.useMemo(() => {
    if (sidebarMenus.length === 0) return null;
    const found = sidebarMenus.find((parent) => {
      if (
        parent.route &&
        (pathname === parent.route || pathname.startsWith(`${parent.route}/`))
      ) {
        return true;
      }
      return parent.children?.some(
        (child) =>
          child.route &&
          (pathname === child.route || pathname.startsWith(`${child.route}/`)),
      );
    });
    return found ? found.id : null;
  }, [sidebarMenus, pathname]);

  // Menu ID đang active: ưu tiên user chọn thủ công -> route hiện tại -> menu đầu tiên
  const activeMenuId =
    selectedMenuId ?? matchedParentId ?? sidebarMenus[0]?.id ?? null;

  // Đối tượng menu cha đang được chọn
  const activeMenu = React.useMemo(() => {
    return (
      sidebarMenus.find((m) => m.id === activeMenuId) || sidebarMenus[0] || null
    );
  }, [sidebarMenus, activeMenuId]);

  // Danh sách các menu con của menu đang chọn (lọc active và sắp xếp)
  const subMenus = React.useMemo(() => {
    if (!activeMenu?.children) return [];
    return activeMenu.children
      .filter((c) => c.isActive !== false && c.isSideBarDisplay !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [activeMenu]);

  // Lọc menu con theo từ khóa tìm kiếm (tên menu)
  const filteredChildren = React.useMemo(() => {
    if (!searchTerm.trim()) return subMenus;
    const term = searchTerm.trim().toLowerCase();
    return subMenus.filter((child) => child.name.toLowerCase().includes(term));
  }, [subMenus, searchTerm]);

  return (
    <Sidebar
      collapsible="offcanvas"
      className={cn(
        "overflow-hidden",
        !isMobile && "*:data-[sidebar=sidebar]:flex-row",
      )}
      style={
        {
          "--sidebar-width": isMobile
            ? "18rem"
            : isSubOpen
              ? "350px"
              : "calc(var(--sidebar-width-icon) + 1px)",
          ...props.style,
        } as React.CSSProperties
      }
      {...props}
    >
      {isMobile ? (
        <MobileTreeSidebar
          menus={sidebarMenus}
          isLoading={isLoading}
          pathname={pathname}
          onClose={() => setOpenMobile(false)}
        />
      ) : (
        <>
          {/* Sidebar 1: Thanh Icon menu chính */}
          <Sidebar
            collapsible="none"
            className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
          >
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    size="lg"
                    className="md:h-8 md:p-0 cursor-pointer"
                    render={<Link href="/" />}
                    onClick={() => {
                      setIsSubOpen(true);
                      setOpen(true);
                    }}
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <Command className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">DA System</span>
                      <span className="truncate text-xs">Enterprise</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent className="px-1.5 md:px-0">
                  <SidebarMenu>
                    {isLoading ? (
                      <div className="flex flex-col gap-2 p-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="size-8 rounded-md" />
                        ))}
                      </div>
                    ) : (
                      sidebarMenus.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            tooltip={{
                              children: item.name,
                              hidden: false,
                            }}
                            onClick={() => {
                              if (activeMenu?.id === item.id) {
                                setIsSubOpen((prev) => {
                                  if (!prev) {
                                    setSearchTerm("");
                                  }
                                  return !prev;
                                });
                              } else {
                                setSelectedMenuId(item.id);
                                setSearchTerm("");
                                setIsSubOpen(true);
                              }
                              setOpen(true);
                            }}
                            isActive={activeMenu?.id === item.id}
                            className="px-2.5 md:px-2 cursor-pointer"
                          >
                            <MenuIcon name={item.icon} className="size-4" />
                            <span>{item.name}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          {/* Sidebar 2: Sub-sidebar hiển thị menu con & ô tìm kiếm */}
          <Sidebar
            collapsible="none"
            className={cn("hidden flex-1 md:flex", !isSubOpen && "md:hidden")}
          >
            <SidebarHeader className="gap-3.5 border-b py-2 px-4">
              <div className="flex w-full items-center justify-between">
                <div className="text-base font-semibold text-foreground truncate">
                  {activeMenu?.name || "Danh mục"}
                </div>
                {/* Nút ẩn sub-sidebar */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsSubOpen(false)}
                  title="Ẩn menu con"
                >
                  <PanelLeftClose className="size-4" />
                  <span className="sr-only">Ẩn menu con</span>
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <SidebarInput
                  placeholder="Tìm kiếm menu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup className="px-0">
                <SidebarGroupContent>
                  {isLoading ? (
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full rounded-md" />
                      ))}
                    </div>
                  ) : subMenus.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm gap-2">
                      <span>Không có menu con</span>
                      {activeMenu?.route && (
                        <Link
                          href={activeMenu.route}
                          className="text-xs text-primary underline underline-offset-4 hover:opacity-80"
                        >
                          Đi tới {activeMenu.name}
                        </Link>
                      )}
                    </div>
                  ) : filteredChildren.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      Không tìm thấy menu phù hợp &quot;{searchTerm}&quot;
                    </div>
                  ) : (
                    <SidebarMenu className="p-2 gap-1">
                      {filteredChildren.map((child) => {
                        const isChildActive = child.route
                          ? pathname === child.route
                          : false;
                        return (
                          <SidebarMenuItem key={child.id}>
                            <SidebarMenuButton
                              render={<Link href={child.route || "#"} />}
                              isActive={isChildActive}
                              className="px-3 py-2 text-sm justify-between w-full"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <MenuIcon
                                  name={child.icon}
                                  className="size-4 shrink-0"
                                />
                                <span className="truncate">{child.name}</span>
                              </div>
                              <ChevronRight className="size-3.5 opacity-50 shrink-0" />
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  )}
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </>
      )}
    </Sidebar>
  );
}
