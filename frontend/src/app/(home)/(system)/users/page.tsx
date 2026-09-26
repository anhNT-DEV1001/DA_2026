"use client";

import * as React from "react";
import { UserTable, UserDetailModal, type UserItem } from "@/features/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEYS } from "@/features/users/hooks";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null);

  // Tìm kiếm với debounce
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleEdit = (user: UserItem) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 w-full">
      {/* Header trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quản lý Người dùng
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Quản lý danh sách tài khoản người dùng, phân quyền vai trò và thông
            tin cá nhân trong hệ thống.
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
            Thêm người dùng
          </Button>
        </div>
      </div>

      {/* Thanh tìm kiếm & bộ lọc */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, username, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-8 text-xs h-9"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bảng danh sách người dùng sử dụng DataTable */}
      <div className="w-full">
        <UserTable
          onEdit={handleEdit}
          queryParams={
            debouncedSearch ? { search: debouncedSearch } : undefined
          }
        />
      </div>

      {/* Modal Thêm & Cập nhật Người dùng */}
      <UserDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        user={selectedUser}
      />
    </div>
  );
}
