"use client";

import * as React from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  MasterDataFilter,
  MasterDataTable,
  MasterDataDetail,
  useMasterDataByGroup,
  useMasterDataGroups,
  useDeleteMasterData,
  MASTERDATA_QUERY_KEY,
  type MasterData,
} from "@/features/masterdata";

export default function MasterDataPage() {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // States quản lý Modal tạo / chỉnh sửa master data
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<MasterData | null>(null);

  // Lấy danh sách nhóm động từ backend (không hardcode)
  const { data: groupOptions = [], isLoading: isLoadingGroups } =
    useMasterDataGroups();

  // Chọn nhóm mặc định là nhóm đầu tiên nếu chưa chọn
  React.useEffect(() => {
    if (!selectedGroup && groupOptions.length > 0) {
      setSelectedGroup(groupOptions[0].group);
    }
  }, [groupOptions, selectedGroup]);

  // Hook lấy danh sách master data theo group
  const {
    data: masterDataList = [],
    isLoading: isLoadingData,
    refetch,
  } = useMasterDataByGroup(selectedGroup, {
    enabled: Boolean(selectedGroup),
  });

  const deleteMutation = useDeleteMasterData();

  // Lọc dữ liệu client-side theo từ khóa tìm kiếm
  const filteredData = React.useMemo(() => {
    if (!masterDataList) return [];
    if (!searchQuery.trim()) return masterDataList;

    const q = searchQuery.toLowerCase().trim();
    return masterDataList.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.value?.toLowerCase().includes(q) ||
        item.group?.toLowerCase().includes(q) ||
        item.nameGroup?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q),
    );
  }, [masterDataList, searchQuery]);

  // Dữ liệu phân trang
  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  // Handlers bộ lọc
  const handleGroupChange = (group: string) => {
    setSelectedGroup(group);
    setPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleResetFilters = () => {
    if (groupOptions.length > 0) {
      setSelectedGroup(groupOptions[0].group);
    } else {
      setSelectedGroup("");
    }
    setSearchQuery("");
    setPage(1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: MASTERDATA_QUERY_KEY });
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setDetailModalOpen(true);
  };

  const handleEdit = (item: MasterData) => {
    setEditingItem(item);
    setDetailModalOpen(true);
  };

  const handleDelete = async (item: MasterData) => {
    if (
      confirm(
        `Bạn có chắc chắn muốn xóa "${item.name || item.value || item.id}" không?`,
      )
    ) {
      try {
        await deleteMutation.mutateAsync(item.id);
      } catch (error) {
        console.error("Lỗi xóa master data:", error);
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 w-full">
      {/* Header trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quản lý Master Data
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Quản lý danh mục dữ liệu master, các nhóm phân loại (Group, Value) và thứ tự hiển thị trong hệ thống.
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
            Thêm master data
          </Button>
        </div>
      </div>

      {/* Component Bộ Lọc */}
      <MasterDataFilter
        selectedGroup={selectedGroup}
        onGroupChange={handleGroupChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        groupOptions={groupOptions}
        onReset={handleResetFilters}
      />

      {/* Component Bảng Hiển Thị & Phân Trang */}
      <div className="w-full">
        <MasterDataTable
          data={paginatedData}
          isLoading={isLoadingData || isLoadingGroups}
          page={page}
          pageSize={pageSize}
          total={filteredData.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Modal Thêm mới / Cập nhật Master Data */}
      <MasterDataDetail
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        item={editingItem}
        defaultGroup={selectedGroup}
      />
    </div>
  );
}
