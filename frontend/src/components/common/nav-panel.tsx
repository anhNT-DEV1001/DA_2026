"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  LayoutGrid,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MENU_ALIAS,
  MenuIcon,
  findMenuByAlias,
  isRouteActive,
  menuHref,
  spaceHref,
  useAppNavigation,
  workspaceHref,
  type MenuItem,
} from "@/features/menus";
import {
  SpaceDetailModal,
  WorkspaceDetailModal,
  WorkspaceMemberDetailModal,
  type SpaceItem,
  type WorkspaceItem,
} from "@/features/workspaces";
import { useAppShellStore } from "@/stores/app-shell-store";

const rowClass =
  "group/row-item flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.98] motion-reduce:transition-none";
const idleRowClass =
  "font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground";
const activeRowClass = "bg-primary/10 font-semibold text-primary";
// Icon trong dòng menu nhích nhẹ khi hover
const rowIconClass =
  "size-4 shrink-0 transition-transform duration-200 ease-out group-hover/row-item:scale-110 motion-reduce:transition-none";
const chevronClass =
  "size-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none";

/**
 * Thu/mở mượt bằng grid-template-rows (0fr <-> 1fr), không cần đo chiều cao
 */
function Collapse({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function isAlias(menu: MenuItem, alias: string) {
  return menu.alias?.toLowerCase() === alias.toLowerCase();
}

function matchesQuery(menu: MenuItem, query: string): boolean {
  if (!query) return true;
  return (
    menu.name.toLowerCase().includes(query) ||
    (menu.children ?? []).some((c) => matchesQuery(c, query))
  );
}

// Menu Workspace không hiện thành dòng (đã có switcher) mà hiện các menu con của nó
function flattenWorkspaceMenu(items: MenuItem[]): MenuItem[] {
  return items.flatMap((m) =>
    isAlias(m, MENU_ALIAS.workspace)
      ? flattenWorkspaceMenu(m.children ?? [])
      : [m],
  );
}

function hasActiveDescendant(menu: MenuItem, pathname: string): boolean {
  return (menu.children ?? []).some(
    (c) => isRouteActive(c.route, pathname) || hasActiveDescendant(c, pathname),
  );
}

/**
 * Dropdown chọn workspace hiện tại ở đầu panel
 */
function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  manageHref,
  onSelect,
  onAddWorkspace,
}: {
  workspaces: WorkspaceItem[];
  currentWorkspace: WorkspaceItem | null;
  manageHref: string | null;
  onSelect: (workspace: WorkspaceItem) => void;
  onAddWorkspace: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-primary">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {currentWorkspace?.name?.charAt(0).toUpperCase() || "W"}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">
            {currentWorkspace?.name || "Chọn workspace"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {currentWorkspace
              ? currentWorkspace.mode === "public"
                ? "Công khai"
                : "Riêng tư"
              : "Chưa có workspace"}
          </span>
        </span>
        <ChevronsUpDown
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 p-1.5" sideOffset={6}>
        {workspaces.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Workspace</DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => onSelect(ws)}
                className="cursor-pointer gap-2.5 py-1.5"
              >
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                  {ws.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate">{ws.name}</span>
                {ws.id === currentWorkspace?.id && (
                  <Check className="text-primary" aria-hidden="true" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onAddWorkspace}
          className="cursor-pointer gap-2.5 py-1.5 text-muted-foreground"
        >
          <Plus aria-hidden="true" />
          Tạo workspace mới
        </DropdownMenuItem>
        {manageHref && (
          <DropdownMenuItem
            render={<Link href={manageHref} />}
            className="cursor-pointer gap-2.5 py-1.5 text-muted-foreground"
          >
            <LayoutGrid aria-hidden="true" />
            Quản lý workspace
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Một menu trong panel: menu lá là link, menu có con là nhóm thu/mở được
 */
function NavMenuNode({
  menu,
  pathname,
  query,
  depth = 0,
}: {
  menu: MenuItem;
  pathname: string;
  query: string;
  depth?: number;
}) {
  const children = (menu.children ?? []).filter((c) => matchesQuery(c, query));
  const href = menuHref(menu.route);
  const isActive = isRouteActive(menu.route, pathname);
  const childActive = hasActiveDescendant(menu, pathname);
  const [expanded, setExpanded] = React.useState(childActive);
  const [prevChildActive, setPrevChildActive] = React.useState(childActive);

  // Tự động mở nhóm khi điều hướng tới menu con
  if (childActive !== prevChildActive) {
    setPrevChildActive(childActive);
    if (childActive) setExpanded(true);
  }

  const isOpen = expanded || Boolean(query);
  const content = (
    <>
      <MenuIcon name={menu.icon} className={rowIconClass} />
      <span className="flex-1 truncate text-left">{menu.name}</span>
    </>
  );

  if (children.length === 0) {
    return (
      <li>
        <Link
          href={href ?? "#"}
          aria-current={isActive ? "page" : undefined}
          className={cn(rowClass, isActive ? activeRowClass : idleRowClass)}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div
        className={cn(
          "group/row relative flex items-center",
          childActive && "text-foreground",
        )}
      >
        {href ? (
          <Link
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              rowClass,
              "pr-9",
              isActive ? activeRowClass : idleRowClass,
              childActive && !isActive && "text-foreground",
            )}
          >
            {content}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(rowClass, "cursor-pointer pr-9", idleRowClass)}
          >
            {content}
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={isOpen}
          aria-label={isOpen ? `Thu gọn ${menu.name}` : `Mở rộng ${menu.name}`}
          className="absolute right-1.5 flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-foreground"
        >
          <ChevronRight
            className={cn(chevronClass, isOpen && "rotate-90")}
            aria-hidden="true"
          />
        </button>
      </div>
      <Collapse open={isOpen}>
        <ul
          className={cn(
            "mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2",
            depth === 0 ? "ml-4" : "ml-3",
          )}
        >
          {children.map((child) => (
            <NavMenuNode
              key={child.id}
              menu={child}
              pathname={pathname}
              query={query}
              depth={depth + 1}
            />
          ))}
        </ul>
      </Collapse>
    </li>
  );
}

/**
 * Section Spaces (menu alias "Spaces" trong DB): liệt kê spaces của workspace hiện tại
 */
function SpacesSection({
  menu,
  workspace,
  spaces,
  activeSpace,
  isLoading,
  canCreate,
  query,
  onCreate,
}: {
  menu: MenuItem;
  workspace: WorkspaceItem | null;
  spaces: SpaceItem[];
  activeSpace: SpaceItem | null;
  isLoading: boolean;
  canCreate: boolean;
  query: string;
  onCreate: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(true);
  const listId = React.useId();
  // Đang ở đúng trang chi tiết workspace (không phải trang space con)
  const isWorkspaceActive = workspace
    ? pathname === workspaceHref(workspace)
    : false;
  const headingId = React.useId();

  const visibleSpaces = React.useMemo(
    () =>
      [...spaces]
        .filter((s) => s.name.toLowerCase().includes(query))
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [spaces, query],
  );

  if (query && visibleSpaces.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-center justify-between px-2.5 pb-1.5">
        <div className="flex items-center gap-0.5">
          {/* Nhấn tên section -> trang chi tiết workspace hiện tại */}
          {workspace ? (
            <Link
              href={workspaceHref(workspace)}
              id={headingId}
              title={`Mở workspace "${workspace.name}"`}
              aria-current={isWorkspaceActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors duration-200 hover:text-foreground",
                isWorkspaceActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <MenuIcon name={menu.icon} className="size-3.5 shrink-0" />
              <span className="underline-offset-4 hover:underline">
                {menu.name}
              </span>
            </Link>
          ) : (
            <span
              id={headingId}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              <MenuIcon name={menu.icon} className="size-3.5 shrink-0" />
              {menu.name}
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={listId}
            aria-label={open ? `Thu gọn ${menu.name}` : `Mở rộng ${menu.name}`}
            className="flex size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-foreground"
          >
            <ChevronDown
              className={cn(chevronClass, !open && "-rotate-90")}
              aria-hidden="true"
            />
          </button>
        </div>
        {canCreate && workspace && (
          <button
            type="button"
            onClick={onCreate}
            aria-label="Thêm space"
            title="Thêm space"
            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-foreground"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <Collapse open={open}>
        <ul
          id={listId}
          className="relative ml-4 flex flex-col gap-0.5 border-l border-border pl-2"
        >
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-8 w-full rounded-lg" />
              </li>
            ))
          ) : !workspace ? (
            <li className="px-2.5 py-2 text-xs text-muted-foreground">
              Chưa chọn workspace
            </li>
          ) : visibleSpaces.length === 0 ? (
            <li className="px-2.5 py-2 text-xs text-muted-foreground">
              {query ? "Không tìm thấy space" : "Workspace này chưa có space nào"}
            </li>
          ) : (
            visibleSpaces.map((space) => {
              const isActive = space.id === activeSpace?.id;
              return (
                <li key={space.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -left-2.25 top-1.5 h-6 w-0.5 rounded-full bg-primary transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
                      isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                    )}
                  />
                  <Link
                    href={spaceHref(workspace, space)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      rowClass,
                      "gap-2.5",
                      isActive
                        ? activeRowClass
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    <MenuIcon
                      name={space.icon || menu.icon}
                      className={rowIconClass}
                    />
                    <span className="flex-1 truncate text-left">{space.name}</span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </Collapse>
    </section>
  );
}

/**
 * Panel menu con của menu gốc đang chọn trên dock:
 * workspace switcher, ô tìm kiếm, menu con (từ DB) và section Spaces
 */
export function NavPanel() {
  const router = useRouter();
  const {
    pathname,
    activeRoot,
    workspaceMenu,
    workspaces,
    currentWorkspace,
    spaces,
    activeSpace,
    canCreateSpace,
    canAddWorkspaceMember,
    isLoading,
    isLoadingSpaces,
  } = useAppNavigation();
  const setSelectedWorkspaceId = useAppShellStore(
    (s) => s.setSelectedWorkspaceId,
  );

  const [query, setQuery] = React.useState("");
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] =
    React.useState(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = React.useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLowerCase();

  // Phím "/" để focus ô tìm kiếm menu
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Đổi menu gốc thì xóa từ khóa tìm kiếm
  const [prevRootId, setPrevRootId] = React.useState(activeRoot?.id);
  if (activeRoot?.id !== prevRootId) {
    setPrevRootId(activeRoot?.id);
    setQuery("");
  }

  const showWorkspaceSwitcher = Boolean(
    workspaceMenu &&
      activeRoot &&
      (activeRoot.id === workspaceMenu.id ||
        findMenuByAlias(activeRoot.children ?? [], MENU_ALIAS.workspace)),
  );

  const handleSelectWorkspace = (ws: WorkspaceItem) => {
    setSelectedWorkspaceId(ws.id);
    setQuery("");
    router.push(workspaceHref(ws));
  };

  const renderMenu = (menu: MenuItem): React.ReactNode => {
    if (isAlias(menu, MENU_ALIAS.spaces)) {
      return (
        <li key={menu.id} className="mt-3">
          <SpacesSection
            menu={menu}
            workspace={currentWorkspace}
            spaces={spaces}
            activeSpace={activeSpace}
            isLoading={isLoadingSpaces}
            canCreate={canCreateSpace}
            query={normalizedQuery}
            onCreate={() => setIsCreateSpaceOpen(true)}
          />
        </li>
      );
    }
    if (!matchesQuery(menu, normalizedQuery)) return null;
    return (
      <NavMenuNode
        key={menu.id}
        menu={menu}
        pathname={pathname}
        query={normalizedQuery}
      />
    );
  };

  const menuNodes = flattenWorkspaceMenu(activeRoot?.children ?? [])
    .map(renderMenu)
    .filter(Boolean);
  const hasVisibleMenu = menuNodes.length > 0;

  return (
    <aside
      aria-label="Menu điều hướng"
      className="flex h-full w-64 shrink-0 flex-col rounded-2xl border border-border bg-sidebar text-sidebar-foreground"
    >
      <div className="p-3">
        {isLoading ? (
          <Skeleton className="h-13 w-full rounded-xl" />
        ) : showWorkspaceSwitcher ? (
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            manageHref={menuHref(workspaceMenu?.route)}
            onSelect={handleSelectWorkspace}
            onAddWorkspace={() => setIsCreateWorkspaceOpen(true)}
          />
        ) : (
          <div
            key={activeRoot?.id}
            className="flex items-center gap-3 p-2 animate-in fade-in-0 duration-300"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MenuIcon name={activeRoot?.icon} className="size-4" />
            </span>
            <span className="truncate text-sm font-semibold">
              {activeRoot?.name || "Danh mục"}
            </span>
          </div>
        )}

        <label className="group/search mt-2 flex h-9 cursor-text items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-sm text-muted-foreground shadow-xs transition-[border-color,box-shadow,color] duration-200 ease-out hover:border-ring/60 focus-within:border-primary focus-within:text-foreground focus-within:ring-3 focus-within:ring-primary/20 motion-reduce:transition-none dark:bg-input/30">
          <Search
            className="size-4 shrink-0 transition-colors duration-200 group-focus-within/search:text-primary"
            aria-hidden="true"
          />
          <span className="sr-only">Tìm kiếm menu</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm menu..."
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/80 [&::-webkit-search-cancel-button]:cursor-pointer"
          />
          <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px] font-medium leading-none text-muted-foreground transition-opacity duration-200 group-focus-within/search:opacity-0">
            /
          </kbd>
        </label>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-3 pb-3">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : hasVisibleMenu ? (
          // key theo menu gốc: đổi menu trên dock thì danh sách trượt nhẹ vào
          <ul
            key={activeRoot?.id}
            className="flex flex-col gap-0.5 animate-in fade-in-0 slide-in-from-left-2 duration-300 ease-out motion-reduce:animate-none"
          >
            {menuNodes}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <span>
              {normalizedQuery
                ? `Không tìm thấy menu "${query.trim()}"`
                : "Không có menu con"}
            </span>
            {!normalizedQuery && menuHref(activeRoot?.route) && (
              <Link
                href={menuHref(activeRoot?.route)!}
                className="text-xs text-primary underline underline-offset-4 hover:opacity-80"
              >
                Đi tới {activeRoot?.name}
              </Link>
            )}
          </div>
        )}
      </div>

      {showWorkspaceSwitcher && currentWorkspace && canAddWorkspaceMember && (
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => setIsAddMemberOpen(true)}
            className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-primary hover:text-primary"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            Thêm thành viên
          </button>
        </div>
      )}

      <WorkspaceDetailModal
        open={isCreateWorkspaceOpen}
        onOpenChange={setIsCreateWorkspaceOpen}
      />
      {currentWorkspace && canAddWorkspaceMember && (
        <WorkspaceMemberDetailModal
          workspaceId={currentWorkspace.id}
          workspaceName={currentWorkspace.name}
          open={isAddMemberOpen}
          onOpenChange={setIsAddMemberOpen}
        />
      )}
      {currentWorkspace && (
        <SpaceDetailModal
          workspaceId={currentWorkspace.id}
          open={isCreateSpaceOpen}
          onOpenChange={setIsCreateSpaceOpen}
          onSuccess={(saved) =>
            router.push(spaceHref(currentWorkspace, saved))
          }
        />
      )}
    </aside>
  );
}
