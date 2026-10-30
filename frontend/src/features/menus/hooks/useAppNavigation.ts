"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import type { Permission } from "@/features/auth";
import {
  useMyWorkspaces,
  useMySpacesInWorkspace,
  type SpaceItem,
  type WorkspaceItem,
} from "@/features/workspaces";
import { useAppShellStore } from "@/stores/app-shell-store";
import { useAuthStore } from "@/stores/auth-store";
import type { MenuItem } from "../types";
import { useSidebarMenus } from "./useMenu";

const VIEW_PERMISSION_ACTION = "ACTION001";
const CREATE_PERMISSION_ACTION = "ACTION002";
// Cùng quyền với API POST /workspaces/:id/members
const ADD_WORKSPACE_MEMBER_PERMISSION = "WORKSPACE_CREATE";

/** Alias của các menu có xử lý riêng trên sidebar (cấu hình trong bảng menus) */
export const MENU_ALIAS = {
  workspace: "Workspace",
  spaces: "Spaces",
  chat: "Chat",
} as const;

export interface NavBreadcrumbItem {
  label: string;
  href?: string;
  icon?: string | null;
}

/**
 * Lọc danh sách menu theo quyền xem (ACTION001) từ thông tin permissions của user (me).
 * Nếu user không có quyền ACTION001 của menu nào thì không hiển thị menu đó trên sidebar.
 */
function filterMenusByViewPermission(
  menus: MenuItem[],
  permissions: Permission[],
): MenuItem[] {
  if (!Array.isArray(menus) || menus.length === 0) return [];
  if (!Array.isArray(permissions) || permissions.length === 0) return [];

  const viewableMenuIds = new Set<number>(
    permissions
      .filter((p) => p.action?.toUpperCase() === VIEW_PERMISSION_ACTION)
      .map((p) => Number(p.menuId)),
  );

  const filterTree = (items: MenuItem[]): MenuItem[] =>
    items
      .filter(
        (item) =>
          viewableMenuIds.has(Number(item.id)) &&
          item.isActive !== false &&
          item.isSideBarDisplay !== false,
      )
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((item) => ({
        ...item,
        children: item.children ? filterTree(item.children) : [],
      }));

  return filterTree(menus);
}

/** Chuẩn hóa route trong DB thành href tuyệt đối (vd: "dashboard" -> "/dashboard") */
export function menuHref(route?: string | null): string | null {
  if (!route || route === "#") return null;
  return route.startsWith("/") ? route : `/${route}`;
}

export function isRouteActive(route: string | null | undefined, pathname: string) {
  const href = menuHref(route);
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function findMenuByAlias(
  items: MenuItem[],
  alias: string,
): MenuItem | null {
  for (const item of items) {
    if (item.alias?.toLowerCase() === alias.toLowerCase()) return item;
    const found = findMenuByAlias(item.children ?? [], alias);
    if (found) return found;
  }
  return null;
}

/** Chuỗi menu từ gốc tới menu sâu nhất khớp route hiện tại */
function findMenuPath(items: MenuItem[], pathname: string): MenuItem[] {
  for (const item of items) {
    const childPath = findMenuPath(item.children ?? [], pathname);
    if (childPath.length > 0) return [item, ...childPath];
    if (isRouteActive(item.route, pathname)) return [item];
  }
  return [];
}

export function workspaceHref(workspace: WorkspaceItem) {
  return `/workspaces/${workspace.slug || workspace.id}`;
}

export function spaceHref(workspace: WorkspaceItem, space: SpaceItem) {
  return `${workspaceHref(workspace)}/spaces/${space.id}`;
}

/**
 * Dữ liệu điều hướng dùng chung cho dock, panel menu và header:
 * menu theo quyền (DB), menu gốc đang chọn, workspace/spaces hiện tại, breadcrumb.
 */
export function useAppNavigation() {
  const pathname = usePathname();
  const permissions = useAuthStore((s) => s.permissions);
  const isAuthInitialized = useAuthStore((s) => s.isInitialized);
  const hasMenuPermission = useAuthStore((s) => s.hasMenuPermission);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const selectedRootId = useAppShellStore((s) => s.selectedRootId);
  const selectedWorkspaceId = useAppShellStore((s) => s.selectedWorkspaceId);

  const { data: rawMenus = [], isLoading: isLoadingMenus } = useSidebarMenus();
  const { data: workspaces = [], isLoading: isLoadingWorkspaces } =
    useMyWorkspaces();

  const rootMenus = React.useMemo(
    () => filterMenusByViewPermission(rawMenus, permissions),
    [rawMenus, permissions],
  );

  const menuPath = React.useMemo(
    () => findMenuPath(rootMenus, pathname),
    [rootMenus, pathname],
  );

  // Menu gốc đang active: ưu tiên user chọn trên dock -> route hiện tại -> menu đầu tiên
  const activeRoot =
    rootMenus.find((m) => m.id === selectedRootId) ??
    menuPath[0] ??
    rootMenus[0] ??
    null;

  const workspaceMenu = findMenuByAlias(rootMenus, MENU_ALIAS.workspace);
  const spacesMenu = findMenuByAlias(rootMenus, MENU_ALIAS.spaces);

  const routeWorkspace = React.useMemo(
    () => workspaces.find((ws) => isRouteActive(workspaceHref(ws), pathname)),
    [workspaces, pathname],
  );

  // Workspace hiện tại: ưu tiên theo route -> user chọn trong dropdown -> workspace đầu tiên
  const currentWorkspace =
    routeWorkspace ??
    workspaces.find((ws) => ws.id === selectedWorkspaceId) ??
    workspaces[0] ??
    null;

  const { data: spaces = [], isLoading: isLoadingSpaces } =
    useMySpacesInWorkspace(spacesMenu ? (currentWorkspace?.id ?? 0) : 0);

  const activeSpace = routeWorkspace
    ? (spaces.find((s) => isRouteActive(spaceHref(routeWorkspace, s), pathname)) ??
      null)
    : null;

  const canCreateSpace = spacesMenu
    ? hasMenuPermission(spacesMenu.id, CREATE_PERMISSION_ACTION)
    : false;

  const canAddWorkspaceMember =
    Boolean(workspaceMenu) && hasPermission(ADD_WORKSPACE_MEMBER_PERMISSION);

  const breadcrumb = React.useMemo<NavBreadcrumbItem[]>(() => {
    if (routeWorkspace) {
      const items: NavBreadcrumbItem[] = [
        {
          label: routeWorkspace.name,
          href: workspaceHref(routeWorkspace),
          icon: workspaceMenu?.icon,
        },
      ];
      if (activeSpace) {
        items.push({ label: activeSpace.name, icon: spacesMenu?.icon });
      }
      return items;
    }
    return menuPath.map((m) => ({
      label: m.name,
      href: menuHref(m.route) ?? undefined,
      icon: m.icon,
    }));
  }, [routeWorkspace, activeSpace, menuPath, workspaceMenu, spacesMenu]);

  return {
    pathname,
    rootMenus,
    activeRoot,
    workspaceMenu,
    spacesMenu,
    workspaces,
    currentWorkspace,
    spaces,
    activeSpace,
    canCreateSpace,
    canAddWorkspaceMember,
    breadcrumb,
    isLoading: isLoadingMenus || isLoadingWorkspaces || !isAuthInitialized,
    isLoadingSpaces,
  };
}
