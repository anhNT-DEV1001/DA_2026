"use client";

import * as React from "react";
import { Edit2, Trash2, Tag } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MasterData } from "../types";

export interface MasterDataTableProps {
  data: MasterData[];
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onEdit?: (item: MasterData) => void;
  onDelete?: (item: MasterData) => void;
}

export function MasterDataTable({
  data,
  isLoading = false,
  page = 1,
  pageSize = 10,
  total,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
}: MasterDataTableProps) {
  const columns: ColumnDef<MasterData>[] = React.useMemo(
    () => [
      {
        id: "stt",
        header: "STT",
        width: "60px",
        align: "center",
        cell: ({ index }) => (
          <span className="text-xs text-muted-foreground font-medium">
            {(page - 1) * pageSize + index + 1}
          </span>
        ),
      },
      {
        accessorKey: "group",
        header: "Nhóm Master Data",
        width: "220px",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="font-mono text-[11px] px-1.5 py-0">
                <Tag className="size-3 mr-1 text-primary shrink-0" />
                {row.group}
              </Badge>
            </div>
            {row.nameGroup && (
              <span className="text-xs text-muted-foreground font-medium pl-0.5">
                {row.nameGroup}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "Tên hiển thị",
        width: "200px",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.name || "—"}
          </span>
        ),
      },
      {
        accessorKey: "value",
        header: "Giá trị (Value)",
        width: "160px",
        cell: ({ row }) => (
          <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded font-mono text-foreground">
            {row.value || "—"}
          </code>
        ),
      },
      {
        accessorKey: "description",
        header: "Mô tả",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground line-clamp-2">
            {row.description || "—"}
          </span>
        ),
      },
      {
        accessorKey: "displayOrder",
        header: "Thứ tự",
        width: "90px",
        align: "center",
        cell: ({ row }) => (
          <span className="text-xs font-semibold px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">
            {row.displayOrder ?? 0}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        width: "100px",
        align: "center",
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onEdit(row)}
                title="Chỉnh sửa"
                className="hover:text-primary"
              >
                <Edit2 className="size-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onDelete(row)}
                title="Xóa"
                className="hover:text-destructive text-muted-foreground"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [page, pageSize, onEdit, onDelete],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      rowKey="id"
      striped
      emptyText="Không tìm thấy master data nào"
      emptyDescription="Thử thay đổi bộ lọc hoặc thêm danh mục mới"
      pagination={
        onPageChange
          ? {
              page,
              pageSize,
              total: total ?? data.length,
              onPageChange,
              onPageSizeChange,
              showPageSizeSelector: true,
              showTotalInfo: true,
            }
          : undefined
      }
    />
  );
}
