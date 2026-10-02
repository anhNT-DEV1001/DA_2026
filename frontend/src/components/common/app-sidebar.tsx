"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Command,
  PanelLeftClose,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "cn";

import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/common/modal";
import { toast } from "@/components/ui/toast";
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
import {
  useMyWorkspaces,
  workspaceService,
  WORKSPACE_QUERY_KEYS,
  WorkspaceDetailModal,
  type WorkspaceItem,
} from "@/features/workspaces";

export type ExtendedMenuItem = MenuItem & {
  rawWorkspace?: WorkspaceItem;
};

/**
 * Kiểm tra xem một menu item có phải là nhánh Workspace hay không
 */
function isWorkspaceMenuItem(item: MenuItem): boolean {
  const alias = item.alias?.toLowerCase() || "";
  const name = item.name?.toLowerCase() || "";
  return (
    alias === "workspace" ||
    alias === "workspaces" ||
    name === "workspace" ||
    name === "workspaces"
  );
}

/**
 * Tích hợp danh sách workspace của user thành menu con của menu Workspace
 */
function enrichMenusWithWorkspaces(
  menus: MenuItem[],
  workspaces: WorkspaceItem[],
): ExtendedMenuItem[] {
  return menus.map((menu) => {
    const isWorkspace = isWorkspaceMenuItem(menu);

    if (isWorkspace) {
      const workspaceSubItems: ExtendedMenuItem[] = workspaces.map((ws) => ({
        id: 100000 + ws.id,
        name: ws.name,
        route: `/workspaces/${ws.slug || ws.id}`,
        icon: ws.mode === "public" ? "Globe" : "Folder",
        alias: `workspace_${ws.slug || ws.id}`,
        parentId: menu.id,
        displayOrder: 0,
        isSideBarDisplay: true,
        isActive: true,
        rawWorkspace: ws,
      }));

      const existingChildren = menu.children
        ? enrichMenusWithWorkspaces(menu.children, workspaces)
        : [];

      return {
        ...menu,
        children: [...workspaceSubItems, ...existingChildren],
      };
    }

    if (menu.children && menu.children.length > 0) {
      return {
        ...menu,
        children: enrichMenusWithWorkspaces(menu.children, workspaces),
      };
    }

    return menu;
  });
}

function SidebarTreeNode({
  item,
  pathname,
  expandedIds,
  toggleExpand,
  onClose,
  onAddWorkspace,
  onDeleteWorkspace,
  depth = 0,
}: {
  item: ExtendedMenuItem;
  pathname: string;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  onClose?: () => void;
  onAddWorkspace?: () => void;
  onDeleteWorkspace?: (workspace: WorkspaceItem) => void;
  depth?: number;
}) {
  const validChildren = React.useMemo(() => {
    if (!item.children) return [];
    return (item.children as ExtendedMenuItem[])
      .filter((c) => c.isActive !== false && c.isSideBarDisplay !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [item.children]);

  const isWorkspace = isWorkspaceMenuItem(item);
  const rawWorkspace = item.rawWorkspace;
  const hasChildren = validChildren.length > 0;
  const isExpanded = expandedIds.has(item.id);
  const isActive = item.route ? pathname === item.route : false;
  const isChildActive =
    hasChildren &&
    validChildren.some(
      (c) =>
        c.route && (pathname === c.route || pathname.startsWith(`${c.route}/`)),
    );

  // Khi CÒN MENU CON: Chỉ toggle mở rộng để xem menu con, KHÔNG navigate
  if (hasChildren) {
    if (depth > 0) {
      return (
        <SidebarMenuSubItem className="group/subitem">
          <SidebarMenuSubButton
            onClick={() => toggleExpand(item.id)}
            isActive={isActive || isChildActive}
            className={cn(
              "w-full justify-between cursor-pointer px-2.5 py-1.5 text-xs font-normal",
              (isActive || isChildActive) && "font-semibold text-foreground",
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <MenuIcon name={item.icon} className="size-3.5 shrink-0" />
              <span className="truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isWorkspace && onAddWorkspace && (
                <span
                  role="button"
                  tabIndex={0}
                  title="Thêm workspace mới"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onAddWorkspace();
                  }}
                  className="p-0.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                >
                  <Plus className="size-3" />
                </span>
              )}
              {rawWorkspace && onDeleteWorkspace && (
                <span
                  role="button"
                  tabIndex={0}
                  title={`Xóa workspace "${item.name}"`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDeleteWorkspace(rawWorkspace);
                  }}
                  className="opacity-0 group-hover/subitem:opacity-100 hover:opacity-100 p-0.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="size-3" />
                </span>
              )}
              <ChevronRight
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-90",
                )}
              />
            </div>
          </SidebarMenuSubButton>

          {isExpanded && (
            <SidebarMenuSub className="my-1 border-l ml-3 pl-2">
              {validChildren.map((child) => (
                <SidebarTreeNode
                  key={child.id}
                  item={child}
                  pathname={pathname}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  onClose={onClose}
                  onAddWorkspace={onAddWorkspace}
                  onDeleteWorkspace={onDeleteWorkspace}
                  depth={depth + 1}
                />
              ))}
            </SidebarMenuSub>
          )}
        </SidebarMenuSubItem>
      );
    }

    return (
      <SidebarMenuItem className="group/item">
        <SidebarMenuButton
          onClick={() => toggleExpand(item.id)}
          isActive={isActive || isChildActive}
          className={cn(
            "w-full justify-between cursor-pointer px-3 py-2 text-sm",
            (isActive || isChildActive) && "font-semibold text-foreground",
          )}
        >
          <div className="flex items-center gap-2.5 truncate">
            <MenuIcon name={item.icon} className="size-4 shrink-0" />
            <span className="truncate font-medium">{item.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isWorkspace && onAddWorkspace && (
              <span
                role="button"
                tabIndex={0}
                title="Thêm workspace mới"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onAddWorkspace();
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
              >
                <Plus className="size-3.5" />
              </span>
            )}
            {rawWorkspace && onDeleteWorkspace && (
              <span
                role="button"
                tabIndex={0}
                title={`Xóa workspace "${item.name}"`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDeleteWorkspace(rawWorkspace);
                }}
                className="opacity-0 group-hover/item:opacity-100 hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <Trash2 className="size-3.5" />
              </span>
            )}
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-90",
              )}
            />
          </div>
        </SidebarMenuButton>

        {isExpanded && (
          <SidebarMenuSub className="my-1 border-l ml-3.5 pl-2">
            {validChildren.map((child) => (
              <SidebarTreeNode
                key={child.id}
                item={child}
                pathname={pathname}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                onClose={onClose}
                onAddWorkspace={onAddWorkspace}
                onDeleteWorkspace={onDeleteWorkspace}
                depth={depth + 1}
              />
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  // TẦNG CUỐI (Leaf node): Điều hướng (navigate) đến route
  if (depth > 0) {
    return (
      <SidebarMenuSubItem className="group/subitem">
        <SidebarMenuSubButton
          render={<Link href={item.route || "#"} />}
          isActive={isActive}
          onClick={onClose}
          className="cursor-pointer px-2.5 py-1.5 text-xs justify-between group-hover/subitem:pr-1"
        >
          <div className="flex items-center gap-2 truncate">
            <MenuIcon name={item.icon} className="size-3.5 shrink-0" />
            <span className="truncate">{item.name}</span>
          </div>
          {rawWorkspace && onDeleteWorkspace && (
            <span
              role="button"
              tabIndex={0}
              title={`Xóa workspace "${item.name}"`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDeleteWorkspace(rawWorkspace);
              }}
              className="opacity-0 group-hover/subitem:opacity-100 hover:opacity-100 p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
            >
              <Trash2 className="size-3.5 shrink-0" />
            </span>
          )}
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <SidebarMenuItem className="group/item">
      <SidebarMenuButton
        render={<Link href={item.route || "#"} />}
        isActive={isActive}
        onClick={onClose}
        className="w-full cursor-pointer px-3 py-2 text-sm justify-between"
      >
        <div className="flex items-center gap-2.5 truncate">
          <MenuIcon name={item.icon} className="size-4 shrink-0" />
          <span className="truncate">{item.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isWorkspace && onAddWorkspace && (
            <span
              role="button"
              tabIndex={0}
              title="Thêm workspace mới"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onAddWorkspace();
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
            >
              <Plus className="size-3.5" />
            </span>
          )}
          {rawWorkspace && onDeleteWorkspace && (
            <span
              role="button"
              tabIndex={0}
              title={`Xóa workspace "${item.name}"`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDeleteWorkspace(rawWorkspace);
              }}
              className="opacity-0 group-hover/item:opacity-100 hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 className="size-3.5 shrink-0" />
            </span>
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function MobileTreeSidebar({
  menus,
  isLoading,
  pathname,
  onClose,
  onAddWorkspace,
  onDeleteWorkspace,
}: {
  menus: ExtendedMenuItem[];
  isLoading: boolean;
  pathname: string;
  onClose: () => void;
  onAddWorkspace?: () => void;
  onDeleteWorkspace?: (workspace: WorkspaceItem) => void;
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [expandedIds, setExpandedIds] = React.useState<Set<number>>(new Set());

  // Auto-expand parent của menu active hiện tại
  React.useEffect(() => {
    if (menus.length === 0) return;
    const activeIds = new Set<number>();
    const findActiveAncestors = (items: ExtendedMenuItem[]) => {
      items.forEach((item) => {
        const isCurrentActive =
          item.route &&
          (pathname === item.route || pathname.startsWith(`${item.route}/`));
        const hasActiveChild = (item.children as ExtendedMenuItem[])?.some(
          (c) =>
            c.route &&
            (pathname === c.route || pathname.startsWith(`${c.route}/`)),
        );
        if (isCurrentActive || hasActiveChild) {
          activeIds.add(item.id);
        }
        if (item.children) {
          findActiveAncestors(item.children as ExtendedMenuItem[]);
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
    const filterItems = (items: ExtendedMenuItem[]): ExtendedMenuItem[] => {
      return items
        .filter(
          (item) => item.isActive !== false && item.isSideBarDisplay !== false,
        )
        .filter((item) => {
          if (!searchTerm.trim()) return true;
          const term = searchTerm.trim().toLowerCase();
          const matchSelf = item.name.toLowerCase().includes(term);
          const matchChildren = (item.children as ExtendedMenuItem[])?.some(
            (c) => c.name.toLowerCase().includes(term),
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
      const matchChildren = (item.children as ExtendedMenuItem[])?.some((c) =>
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
                  <SidebarTreeNode
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    onClose={onClose}
                    onAddWorkspace={onAddWorkspace}
                    onDeleteWorkspace={onDeleteWorkspace}
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
  const queryClient = useQueryClient();
  const { setOpen, isMobile, setOpenMobile } = useSidebar();

  const { data: rawSidebarMenus = [], isLoading: isLoadingMenus } =
    useSidebarMenus();
  const { data: myWorkspaces = [], isLoading: isLoadingWorkspaces } =
    useMyWorkspaces();

  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] =
    React.useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] =
    React.useState<WorkspaceItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [selectedMenuId, setSelectedMenuId] = React.useState<number | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isSubOpen, setIsSubOpen] = React.useState(true);
  const [desktopExpandedIds, setDesktopExpandedIds] = React.useState<
    Set<number>
  >(new Set());

  // Tích hợp workspace vào nhánh menu có alias/tên Workspace
  const sidebarMenus = React.useMemo(() => {
    return enrichMenusWithWorkspaces(rawSidebarMenus, myWorkspaces);
  }, [rawSidebarMenus, myWorkspaces]);

  const isLoading = isLoadingMenus || isLoadingWorkspaces;

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
      return (parent.children as ExtendedMenuItem[])?.some(
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

  const isActiveMenuWorkspace = activeMenu
    ? isWorkspaceMenuItem(activeMenu)
    : false;

  // Danh sách các menu con của menu đang chọn (lọc active và sắp xếp)
  const subMenus = React.useMemo(() => {
    if (!activeMenu?.children) return [];
    return (activeMenu.children as ExtendedMenuItem[])
      .filter((c) => c.isActive !== false && c.isSideBarDisplay !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [activeMenu]);

  // Xử lý xác nhận xóa workspace
  const handleConfirmDelete = async () => {
    if (!workspaceToDelete) return;
    try {
      setIsDeleting(true);
      await workspaceService.deleteWorkspace(workspaceToDelete.id);
      queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.all });
      toast.add({
        title: "Xóa workspace thành công",
        description: `Workspace "${workspaceToDelete.name}" đã được chuyển vào thùng rác.`,
        type: "success",
      });
      setWorkspaceToDelete(null);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const apiMessage = err?.response?.data?.message || err?.message;
      toast.add({
        title: "Xóa workspace thất bại",
        description: Array.isArray(apiMessage)
          ? apiMessage.join(", ")
          : apiMessage || "Có lỗi xảy ra khi xóa workspace",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle mở/đóng node trên desktop sub-sidebar
  const toggleDesktopExpand = React.useCallback((id: number) => {
    setDesktopExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Tự động mở rộng các node cha của route hiện tại trong Desktop sub-sidebar
  React.useEffect(() => {
    if (subMenus.length === 0) return;
    const activeIds = new Set<number>();
    const findActiveAncestors = (items: ExtendedMenuItem[]) => {
      items.forEach((item) => {
        const isCurrentActive =
          item.route &&
          (pathname === item.route || pathname.startsWith(`${item.route}/`));
        const hasActiveChild = (item.children as ExtendedMenuItem[])?.some(
          (c) =>
            c.route &&
            (pathname === c.route || pathname.startsWith(`${c.route}/`)),
        );
        if (isCurrentActive || hasActiveChild) {
          activeIds.add(item.id);
        }
        if (item.children) {
          findActiveAncestors(item.children as ExtendedMenuItem[]);
        }
      });
    };
    findActiveAncestors(subMenus);
    if (activeIds.size > 0) {
      setDesktopExpandedIds((prev) => new Set([...prev, ...activeIds]));
    }
  }, [subMenus, pathname]);

  // Lọc menu con theo từ khóa tìm kiếm (hỗ trợ đa cấp cây)
  const filteredChildren = React.useMemo(() => {
    const filterBranch = (items: ExtendedMenuItem[]): ExtendedMenuItem[] => {
      return items
        .filter(
          (item) => item.isActive !== false && item.isSideBarDisplay !== false,
        )
        .filter((item) => {
          if (!searchTerm.trim()) return true;
          const term = searchTerm.trim().toLowerCase();
          const matchSelf = item.name.toLowerCase().includes(term);
          const matchChildren = (item.children as ExtendedMenuItem[])?.some(
            (c) => c.name.toLowerCase().includes(term),
          );
          return matchSelf || matchChildren;
        })
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    };

    return filterBranch(subMenus);
  }, [subMenus, searchTerm]);

  // Khi tìm kiếm, tự động mở rộng các node chứa kết quả
  React.useEffect(() => {
    if (!searchTerm.trim() || subMenus.length === 0) return;
    const term = searchTerm.trim().toLowerCase();
    const matchingIds = new Set<number>();
    const findMatchingNodes = (items: ExtendedMenuItem[]) => {
      items.forEach((item) => {
        const matchChildren = (item.children as ExtendedMenuItem[])?.some(
          (c) => c.name.toLowerCase().includes(term),
        );
        if (matchChildren) {
          matchingIds.add(item.id);
        }
        if (item.children) {
          findMatchingNodes(item.children as ExtendedMenuItem[]);
        }
      });
    };
    findMatchingNodes(subMenus);
    setDesktopExpandedIds((prev) => new Set([...prev, ...matchingIds]));
  }, [searchTerm, subMenus]);

  return (
    <>
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
            onAddWorkspace={() => setIsCreateWorkspaceOpen(true)}
            onDeleteWorkspace={(ws) => setWorkspaceToDelete(ws)}
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

            {/* Sidebar 2: Sub-sidebar hiển thị menu con đa cấp dạng Tree view & ô tìm kiếm */}
            <Sidebar
              collapsible="none"
              className={cn("hidden flex-1 md:flex", !isSubOpen && "md:hidden")}
            >
              <SidebarHeader className="gap-3.5 border-b py-2 px-4">
                <div className="flex w-full items-center justify-between">
                  <div className="text-base font-semibold text-foreground truncate">
                    {activeMenu?.name || "Danh mục"}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Nút + thêm workspace khi đang ở menu Workspace */}
                    {isActiveMenuWorkspace && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        onClick={() => setIsCreateWorkspaceOpen(true)}
                        title="Thêm workspace mới"
                      >
                        <Plus className="size-4" />
                        <span className="sr-only">Thêm workspace</span>
                      </Button>
                    )}
                    {/* Nút ẩn sub-sidebar */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => setIsSubOpen(false)}
                      title="Ẩn menu con"
                    >
                      <PanelLeftClose className="size-4" />
                      <span className="sr-only">Ẩn menu con</span>
                    </Button>
                  </div>
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
                        {isActiveMenuWorkspace ? (
                          <>
                            <span>Chưa có workspace nào</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-1 gap-1.5 text-xs cursor-pointer"
                              onClick={() => setIsCreateWorkspaceOpen(true)}
                            >
                              <Plus className="size-3.5" />
                              Tạo workspace mới
                            </Button>
                          </>
                        ) : (
                          <>
                            <span>Không có menu con</span>
                            {activeMenu?.route && (
                              <Link
                                href={activeMenu.route}
                                className="text-xs text-primary underline underline-offset-4 hover:opacity-80"
                              >
                                Đi tới {activeMenu.name}
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    ) : filteredChildren.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        Không tìm thấy menu phù hợp &quot;{searchTerm}&quot;
                      </div>
                    ) : (
                      <SidebarMenu className="p-2 gap-1">
                        {filteredChildren.map((child) => (
                          <SidebarTreeNode
                            key={child.id}
                            item={child}
                            pathname={pathname}
                            expandedIds={desktopExpandedIds}
                            toggleExpand={toggleDesktopExpand}
                            onAddWorkspace={() =>
                              setIsCreateWorkspaceOpen(true)
                            }
                            onDeleteWorkspace={(ws) =>
                              setWorkspaceToDelete(ws)
                            }
                            depth={0}
                          />
                        ))}
                      </SidebarMenu>
                    )}
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
          </>
        )}
      </Sidebar>

      {/* Modal tạo workspace mới từ Sidebar */}
      <WorkspaceDetailModal
        open={isCreateWorkspaceOpen}
        onOpenChange={setIsCreateWorkspaceOpen}
      />

      {/* Modal xác nhận xóa Workspace */}
      <Modal
        open={Boolean(workspaceToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setWorkspaceToDelete(null);
          }
        }}
        size="sm"
        variant="destructive"
        title="Xác nhận xóa Workspace"
        description={
          <span>
            Bạn có chắc chắn muốn xóa không gian làm việc{" "}
            <strong className="text-foreground font-semibold">
              &ldquo;{workspaceToDelete?.name}&rdquo;
            </strong>{" "}
            không? Hành động này sẽ chuyển workspace vào thùng rác.
          </span>
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        confirmVariant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
