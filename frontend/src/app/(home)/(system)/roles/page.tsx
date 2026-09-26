"use client";

import * as React from "react";
import { RoleTable, RoleDetailModal, type RoleItem } from "@/features/roles";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ROLE_QUERY_KEYS } from "@/features/roles/hooks";

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<RoleItem | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEYS.all });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCreate = () => {
    setSelectedRole(null);
    setModalOpen(true);
  };

  const handleEdit = (role: RoleItem) => {
    setSelectedRole(role);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 w-full">
      {/* Header trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quản lý Vai trò
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Quản lý danh sách vai trò, chức năng phân quyền và quyền hạn người
            dùng trong hệ thống.
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
            Thêm vai trò
          </Button>
        </div>
      </div>

      {/* Danh sách bảng Vai trò sử dụng DataTable */}
      <div className="w-full">
        <RoleTable onEdit={handleEdit} />
      </div>

      {/* Modal Thêm & Cập nhật Vai trò */}
      <RoleDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        role={selectedRole}
      />
    </div>
  );
}
