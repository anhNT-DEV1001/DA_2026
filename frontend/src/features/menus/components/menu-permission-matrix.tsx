"use client";

import * as React from "react";
import { useMenuPermissionMatrix } from "../hooks";
import { useRolePermissions } from "@/features/roles/hooks";
import { MenuIcon } from "./menu-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useMasterDataByGroup } from "@/features/masterdata";
import type { MenuItem } from "../types";
import {
  ShieldCheck,
  Search,
  Save,
  RotateCw,
  ArrowLeft,
  Loader2,
  Folder,
  FolderOpen,
} from "lucide-react";

export interface MenuPermissionMatrixProps {
  roleId?: number;
  roleName?: string;
  onBack?: () => void;
}

interface FlattenedMenuNode {
  menu: MenuItem;
  depth: number;
}

export function MenuPermissionMatrix({
  roleId,
  roleName,
  onBack,
}: MenuPermissionMatrixProps) {
  const {
    data: matrixData,
    isLoading: isLoadingMatrix,
    refetch,
  } = useMenuPermissionMatrix();

  const {
    assignedPermissionIds,
    isLoadingRolePermissions,
    updateRolePermissions,
    isUpdatingRolePermissions,
  } = useRolePermissions(roleId);

  // Set lưu trữ danh sách ID các permission được tích chọn
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = React.useState("");

  // Cập nhật selectedIds khi dữ liệu permissions từ server trả về
  React.useEffect(() => {
    if (assignedPermissionIds) {
      setSelectedIds(new Set(assignedPermissionIds));
    }
  }, [assignedPermissionIds]);

  // Phẳng hóa cây Menu thành danh sách phẳng kèm độ sâu (depth)
  const flattenedMenus = React.useMemo(() => {
    const list: FlattenedMenuNode[] = [];
    const traverse = (items: MenuItem[], depth = 0) => {
      items.forEach((item) => {
        list.push({ menu: item, depth });
        if (item.children && item.children.length > 0) {
          traverse(item.children, depth + 1);
        }
      });
    };

    if (Array.isArray(matrixData)) {
      traverse(matrixData);
    }
    return list;
  }, [matrixData]);

  // Lấy danh sách master data nhóm ACTION để đồng bộ tất cả tên thao tác động
  const { data: actionMasterData = [] } = useMasterDataByGroup("ACTION");

  // Map tra cứu Tên thao tác (Name) từ mã Value trong master data
  const actionNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};

    actionMasterData.forEach((m) => {
      if (m.value) {
        map[m.value.toUpperCase()] = m.name || m.value;
      }
      if (m.name) {
        map[m.name.toUpperCase()] = m.name;
      }
    });

    return map;
  }, [actionMasterData]);

  // Thu thập tất cả các loại hành động (Action) từ Master Data + Menu Permissions
  const distinctActions = React.useMemo(() => {
    const actionsSet = new Set<string>();

    // Ưu tiên đưa các action value từ Master Data vào trước
    actionMasterData.forEach((m) => {
      if (m.value) actionsSet.add(m.value.toUpperCase());
    });

    // Bổ sung các action value thực tế có trên permissions của menu
    flattenedMenus.forEach(({ menu }) => {
      menu.permissions?.forEach((p) => {
        if (p.action) actionsSet.add(p.action.toUpperCase());
      });
    });

    return Array.from(actionsSet);
  }, [actionMasterData, flattenedMenus]);

  // Map danh sách permissionId theo từng Action (dùng cho checkbox chọn tất cả theo cột)
  const actionPermissionIdsMap = React.useMemo(() => {
    const map: Record<string, number[]> = {};
    distinctActions.forEach((act) => {
      map[act] = [];
    });

    flattenedMenus.forEach(({ menu }) => {
      menu.permissions?.forEach((p) => {
        const act = p.action ? p.action.toUpperCase() : "";
        if (map[act]) {
          map[act].push(p.id);
        }
      });
    });
    return map;
  }, [flattenedMenus, distinctActions]);

  // Lọc danh sách menu theo từ khóa tìm kiếm
  const filteredMenus = React.useMemo(() => {
    if (!searchTerm.trim()) return flattenedMenus;
    const term = searchTerm.toLowerCase();

    return flattenedMenus.filter(({ menu }) => {
      const matchName = menu.name.toLowerCase().includes(term);
      const matchAlias = menu.alias.toLowerCase().includes(term);
      const matchPerm = menu.permissions?.some(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term) ||
          p.action.toLowerCase().includes(term),
      );
      return matchName || matchAlias || matchPerm;
    });
  }, [flattenedMenus, searchTerm]);

  // Tất cả permission IDs có trong toàn bộ hệ thống
  const allPermissionIds = React.useMemo(() => {
    const ids: number[] = [];
    flattenedMenus.forEach(({ menu }) => {
      menu.permissions?.forEach((p) => ids.push(p.id));
    });
    return ids;
  }, [flattenedMenus]);

  // Kiểm tra xem tất cả quyền hệ thống có được tích chọn không
  const isSystemAllSelected =
    allPermissionIds.length > 0 &&
    allPermissionIds.every((id) => selectedIds.has(id));

  // Tích chọn / Bỏ chọn tất cả các quyền trên toàn ma trận
  const handleToggleSystemAll = (select: boolean) => {
    if (select) {
      setSelectedIds(new Set(allPermissionIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Tích chọn / Bỏ chọn tất cả theo cột Action trên Header
  const handleToggleActionColumn = (action: string, select: boolean) => {
    const targetIds = actionPermissionIdsMap[action] || [];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      targetIds.forEach((id) => {
        if (select) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  // Kiểm tra xem tất cả quyền của 1 cột Action có được chọn hết chưa
  const isActionColumnAllSelected = (action: string): boolean => {
    const targetIds = actionPermissionIdsMap[action] || [];
    if (targetIds.length === 0) return false;
    return targetIds.every((id) => selectedIds.has(id));
  };

  // Tích chọn / Bỏ chọn tất cả quyền của 1 dòng Menu (Hàng)
  const handleToggleMenuRow = (menu: MenuItem, select: boolean) => {
    const permIds = (menu.permissions || []).map((p) => p.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      permIds.forEach((id) => {
        if (select) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  // Kiểm tra xem tất cả quyền của 1 Menu row có được chọn hết chưa
  const isMenuRowAllSelected = (menu: MenuItem): boolean => {
    const perms = menu.permissions || [];
    if (perms.length === 0) return false;
    return perms.every((p) => selectedIds.has(p.id));
  };

  // Tích / Bỏ tích 1 permission đơn lẻ
  const handleToggleSinglePermission = (permissionId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  // Lưu cấu hình phân quyền
  const handleSave = async () => {
    if (!roleId) {
      toast.add({
        title: "Thiếu dữ liệu",
        description: "Không tìm thấy thông tin ID của vai trò.",
        type: "error",
      });
      return;
    }

    try {
      const idsArray = Array.from(selectedIds);
      await updateRolePermissions(idsArray);
      toast.add({
        title: "Cập nhật thành công",
        description: `Đã lưu cấu hình phân quyền cho vai trò "${roleName || roleId}".`,
        type: "success",
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.add({
        title: "Cập nhật thất bại",
        description: err?.message || "Có lỗi xảy ra khi lưu quyền hạn.",
        type: "error",
      });
    }
  };

  const isLoading = isLoadingMatrix || isLoadingRolePermissions;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 w-full min-w-0 max-w-full overflow-hidden">
      {/* Header trang Ma trận Phân quyền */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onBack}
              className="size-8 shrink-0 rounded-lg cursor-pointer"
              title="Quay lại danh sách vai trò"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Ma trận Phân quyền {roleName ? `- ${roleName}` : ""}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tích chọn các quyền thao tác cho từng chức năng menu thuộc về vai
              trò này.
            </p>
          </div>
        </div>

        {/* Nút thao tác nhanh trên Top */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-1.5 text-xs font-medium cursor-pointer"
          >
            <RotateCw
              className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isUpdatingRolePermissions || !roleId}
            className="gap-1.5 text-xs font-medium bg-primary hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            {isUpdatingRolePermissions ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* Thanh tìm kiếm & chọn tất cả hệ thống */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border border-border/60">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm menu hoặc mã thao tác..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground select-none">
            <input
              type="checkbox"
              checked={isSystemAllSelected}
              onChange={(e) => handleToggleSystemAll(e.target.checked)}
              className="size-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
            />
            <span>Chọn tất cả hệ thống</span>
          </label>
          <span className="text-xs text-muted-foreground">
            (Đã chọn:{" "}
            <strong className="text-primary font-bold">{selectedIds.size}</strong> /{" "}
            {allPermissionIds.length} quyền)
          </span>
        </div>
      </div>

      {/* Bảng Ma trận Phân quyền Grid với Sticky Columns và Scrollable Middle Columns */}
      <div className="w-full min-w-0 max-w-full rounded-xl border border-border/70 overflow-hidden bg-card shadow-sm flex flex-col isolate">
        <div className="w-full max-w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] relative scrollbar-thin">
          <table className="w-max min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr className="bg-muted text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                {/* Cột 1: Menu / Chức năng - Sticky Left + Sticky Top (z-30 bên trong isolate) */}
                <th className="sticky left-0 top-0 z-30 bg-muted py-3 px-4 w-[280px] min-w-[280px] max-w-[280px] border-b border-r border-border/70 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">MENU / CHỨC NĂNG</span>
                  </div>
                </th>

                {/* Các cột Action động (Xem, Thêm, Sửa, Xóa,...) - Sticky Top (z-20 bên trong isolate) */}
                {distinctActions.map((action) => {
                  const isAllActionSelected = isActionColumnAllSelected(action);
                  const displayActionName = actionNameMap[action] || action;

                  return (
                    <th
                      key={action}
                      className="sticky top-0 z-20 bg-muted py-3 px-3 text-center w-[130px] min-w-[130px] max-w-[140px] border-b border-r border-border/50 select-none"
                    >
                      <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer max-w-full">
                        <input
                          type="checkbox"
                          checked={isAllActionSelected}
                          onChange={(e) =>
                            handleToggleActionColumn(action, e.target.checked)
                          }
                          className="size-3.5 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer shrink-0"
                        />
                        <div className="flex flex-col items-start text-left truncate leading-tight">
                          <span className="font-bold text-foreground truncate max-w-[85px]" title={displayActionName}>
                            {displayActionName}
                          </span>
                          {displayActionName !== action && (
                            <span className="text-[9px] text-muted-foreground font-mono font-normal truncate max-w-[85px]" title={action}>
                              {action}
                            </span>
                          )}
                        </div>
                      </label>
                    </th>
                  );
                })}

                {/* Cột cuối cùng: Chọn tất cả của hàng (Row Action) - Sticky Right + Sticky Top (z-30 bên trong isolate) */}
                <th className="sticky right-0 top-0 z-30 bg-muted py-3 px-3 text-center w-[100px] min-w-[100px] max-w-[100px] border-b border-l border-border/70 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.08)] select-none">
                  <span className="font-bold text-foreground">TẤT CẢ HÀNG</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMenus.map(({ menu, depth }) => {
                const perms = menu.permissions || [];
                const hasPerms = perms.length > 0;
                const isRowAllSelected = isMenuRowAllSelected(menu);

                return (
                  <tr
                    key={menu.id}
                    className="group hover:bg-muted/20 transition-colors"
                  >
                    {/* Cột 1: Tên Menu - Sticky Left (z-10 bên trong isolate) */}
                    <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/40 transition-colors py-2.5 px-4 w-[280px] min-w-[280px] max-w-[280px] border-b border-r border-border/60 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]">
                      <div
                        className="flex items-center gap-2 min-w-0"
                        style={{ paddingLeft: `${depth * 16}px` }}
                      >
                        {depth > 0 ? (
                          <FolderOpen className="size-4 text-muted-foreground/70 shrink-0" />
                        ) : (
                          <Folder className="size-4 text-primary shrink-0" />
                        )}

                        <MenuIcon
                          name={menu.icon}
                          className="size-4 text-muted-foreground shrink-0"
                        />

                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-foreground truncate" title={menu.name}>
                            {menu.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate" title={menu.alias}>
                            {menu.alias}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Các cột Checkbox theo Action (Scrollable ở giữa) */}
                    {distinctActions.map((action) => {
                      const matchingPerms = perms.filter(
                        (p) => p.action && p.action.toUpperCase() === action,
                      );

                      if (matchingPerms.length === 0) {
                        return (
                          <td
                            key={action}
                            className="py-2.5 px-3 text-center text-muted-foreground/30 border-b border-r border-border/40 select-none w-[130px] min-w-[130px] max-w-[140px]"
                          >
                            <span className="font-mono text-xs">—</span>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={action}
                          className="py-2.5 px-3 text-center border-b border-r border-border/40 w-[130px] min-w-[130px] max-w-[140px]"
                        >
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {matchingPerms.map((perm) => {
                              const isChecked = selectedIds.has(perm.id);

                              return (
                                <label
                                  key={perm.id}
                                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium cursor-pointer select-none transition-all ${
                                    isChecked
                                      ? "bg-primary/10 border-primary/40 text-primary font-semibold shadow-xs"
                                      : "bg-background border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                  }`}
                                  title={`${perm.name} (${perm.code})`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      handleToggleSinglePermission(perm.id)
                                    }
                                    className="size-3.5 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer shrink-0"
                                  />
                                  <span className="truncate max-w-[70px]">{perm.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}

                    {/* Cột cuối cùng: Checkbox chọn tất cả các quyền của Hàng - Sticky Right (z-10 bên trong isolate) */}
                    <td className="sticky right-0 z-10 bg-card group-hover:bg-muted/40 transition-colors py-2.5 px-3 text-center w-[100px] min-w-[100px] max-w-[100px] border-b border-l border-border/60 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.08)]">
                      {hasPerms ? (
                        <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground select-none">
                          <input
                            type="checkbox"
                            checked={isRowAllSelected}
                            onChange={(e) =>
                              handleToggleMenuRow(menu, e.target.checked)
                            }
                            className="size-3.5 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer shrink-0"
                          />
                          <span className="font-medium">Tất cả</span>
                        </label>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/40 italic select-none">
                          Không có
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredMenus.length === 0 && (
                <tr>
                  <td
                    colSpan={distinctActions.length + 2}
                    className="py-12 text-center text-muted-foreground border-b border-border/60"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span>Đang tải ma trận phân quyền...</span>
                      </div>
                    ) : (
                      <p className="text-xs">
                        Không tìm thấy chức năng menu hoặc quyền thao tác phù
                        hợp.
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
