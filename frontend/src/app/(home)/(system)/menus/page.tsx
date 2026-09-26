"use client";

import * as React from "react";
import { MenuTable, MenuDetailModal, type MenuItem } from "@/features/menus";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { MENU_QUERY_KEYS } from "@/features/menus/hooks";

export default function MenusPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedMenu, setSelectedMenu] = React.useState<MenuItem | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEYS.all });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCreate = () => {
    setSelectedMenu(null);
    setModalOpen(true);
  };

  const handleEdit = (menu: MenuItem) => {
    setSelectedMenu(menu);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 w-full">
      {/* Header trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quản lý Menu
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Quản lý cấu trúc điều hướng, icon, đường dẫn và quyền hiển thị menu
            trên sidebar.
          </p>
        </div>

        {/* Nút tác vụ */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 text-xs font-medium"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>

          <Button
            size="sm"
            className="gap-1.5 text-xs font-medium"
            onClick={handleCreate}
          >
            <Plus className="size-3.5" />
            Thêm menu
          </Button>
        </div>
      </div>

      {/* Danh sách bảng Menu sử dụng DataTable */}
      <div className="w-full">
        <MenuTable onEdit={handleEdit} />
      </div>

      {/* Modal Thêm & Cập nhật Menu */}
      <MenuDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        menu={selectedMenu}
      />
    </div>
  );
}
