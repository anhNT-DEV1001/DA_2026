"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
} from "lucide-react";

export type CellAlign = "left" | "center" | "right";

export interface ColumnDef<TData> {
  id?: string;
  header:
    | React.ReactNode
    | ((props: { column: ColumnDef<TData> }) => React.ReactNode);
  accessorKey?: keyof TData | string;
  cell?: (props: {
    row: TData;
    index: number;
    value: unknown;
  }) => React.ReactNode;
  align?: CellAlign;
  width?: string | number;
  minWidth?: string | number;
  className?: string;
  headerClassName?: string;
}

export interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total?: number;
  pageCount?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
  showTotalInfo?: boolean;
  disabled?: boolean;
}

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  loadingRowCount?: number;
  emptyText?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  pagination?: DataTablePaginationProps;
  onRowClick?: (row: TData, index: number) => void;
  rowKey?: keyof TData | ((row: TData, index: number) => string | number);
  rowClassName?: string | ((row: TData, index: number) => string | undefined);
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  stickyHeader?: boolean;
  striped?: boolean;
  bordered?: boolean;
  dense?: boolean;
}

/**
 * Lấy giá trị từ object theo key hoặc path (ví dụ "user.name")
 */
function getRowValue<TData>(
  row: TData,
  accessorKey?: keyof TData | string,
): unknown {
  if (!accessorKey) return undefined;
  if (typeof accessorKey === "string" && accessorKey.includes(".")) {
    return accessorKey.split(".").reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object" && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, row);
  }
  return (row as Record<string, unknown>)[accessorKey as string];
}

const alignClasses: Record<CellAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * Component Phân trang của Data Table
 */
export function DataTablePagination({
  page,
  pageSize,
  total,
  pageCount,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showTotalInfo = true,
  disabled = false,
}: DataTablePaginationProps) {
  const totalPages =
    pageCount ??
    (typeof total === "number" ? Math.max(1, Math.ceil(total / pageSize)) : 1);

  const startRecord =
    typeof total === "number" && total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endRecord =
    typeof total === "number"
      ? Math.min(page * pageSize, total)
      : page * pageSize;

  const canPrev = page > 1 && !disabled;
  const canNext = page < totalPages && !disabled;

  // Tính toán dãy trang hiển thị kèm dấu ba chấm
  const pages = React.useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const items: (number | "ellipsis-start" | "ellipsis-end")[] = [1];

    if (page > 3) {
      items.push("ellipsis-start");
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let p = start; p <= end; p++) {
      items.push(p);
    }

    if (page < totalPages - 2) {
      items.push("ellipsis-end");
    }

    if (totalPages > 1) {
      items.push(totalPages);
    }

    return items;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-card text-xs text-muted-foreground select-none">
      {/* Thông tin số lượng & Chọn page size */}
      <div className="flex flex-wrap items-center gap-4 order-2 sm:order-1">
        {showTotalInfo && typeof total === "number" && (
          <p>
            Hiển thị{" "}
            <span className="font-semibold text-foreground">
              {startRecord} - {endRecord}
            </span>{" "}
            trong số{" "}
            <span className="font-semibold text-foreground">{total}</span> kết
            quả
          </p>
        )}

        {showTotalInfo && typeof total === "undefined" && (
          <p>
            Trang <span className="font-semibold text-foreground">{page}</span>{" "}
            /{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </p>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap">Số hàng:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                if (val) onPageSizeChange(Number(val));
              }}
              disabled={disabled}
            >
              <SelectTrigger
                size="sm"
                className="h-7 min-w-[70px] px-2 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Các nút bấm chuyển trang */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button
          variant="outline"
          size="icon-sm"
          className="size-7"
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          title="Trang đầu"
          aria-label="Trang đầu"
        >
          <ChevronsLeft className="size-3.5" />
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          className="size-7"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          title="Trang trước"
          aria-label="Trang trước"
        >
          <ChevronLeft className="size-3.5" />
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {pages.map((item, idx) => {
            if (item === "ellipsis-start" || item === "ellipsis-end") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 text-muted-foreground tracking-widest text-xs"
                >
                  …
                </span>
              );
            }

            const isCurrent = item === page;
            return (
              <Button
                key={item}
                variant={isCurrent ? "default" : "outline"}
                size="icon-sm"
                className={cn(
                  "size-7 text-xs font-medium transition-all",
                  isCurrent
                    ? "pointer-events-none shadow-xs"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground",
                )}
                onClick={() => onPageChange(item)}
                disabled={disabled}
                aria-current={isCurrent ? "page" : undefined}
              >
                {item}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          className="size-7"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          title="Trang sau"
          aria-label="Trang sau"
        >
          <ChevronRight className="size-3.5" />
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          className="size-7"
          onClick={() => onPageChange(totalPages)}
          disabled={!canNext}
          title="Trang cuối"
          aria-label="Trang cuối"
        >
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Reusable Common DataTable Component
 */
export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  loadingRowCount = 5,
  emptyText = "Không có dữ liệu",
  emptyDescription = "Chưa có bản ghi nào để hiển thị",
  emptyIcon,
  pagination,
  onRowClick,
  rowKey,
  rowClassName,
  className,
  tableClassName,
  headerClassName,
  bodyClassName,
  stickyHeader = false,
  striped = false,
  bordered = false,
  dense = false,
}: DataTableProps<TData>) {
  const getRowId = (row: TData, index: number): string | number => {
    if (typeof rowKey === "function") return rowKey(row, index);
    const record = row as Record<string, unknown>;
    if (rowKey && record[rowKey as string] !== undefined) {
      return String(record[rowKey as string]);
    }
    if (record?.id !== undefined) return String(record.id);
    return index;
  };

  const getComputedRowClassName = (row: TData, index: number): string => {
    let custom = "";
    if (typeof rowClassName === "function") {
      custom = rowClassName(row, index) || "";
    } else if (typeof rowClassName === "string") {
      custom = rowClassName;
    }

    return cn(
      "transition-colors",
      onRowClick && "cursor-pointer hover:bg-muted/70",
      striped && index % 2 === 1 && "bg-muted/25",
      custom,
    );
  };

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border bg-card shadow-xs overflow-hidden flex flex-col",
        className,
      )}
    >
      <div className="relative w-full overflow-x-auto">
        <Table className={cn("w-full text-sm", tableClassName)}>
          <TableHeader
            className={cn(
              "bg-muted/50 border-b",
              stickyHeader && "sticky top-0 z-10 backdrop-blur-xs",
              headerClassName,
            )}
          >
            <TableRow className="hover:bg-transparent">
              {columns.map((col, idx) => {
                const align = col.align ?? "left";
                return (
                  <TableHead
                    key={
                      col.id ||
                      (col.accessorKey !== undefined
                        ? String(col.accessorKey)
                        : undefined) ||
                      `col-${idx}`
                    }
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                    }}
                    className={cn(
                      "h-10 px-3 font-semibold text-xs tracking-wider text-muted-foreground uppercase whitespace-nowrap",
                      alignClasses[align],
                      bordered && "border-r last:border-r-0",
                      col.headerClassName,
                    )}
                  >
                    {typeof col.header === "function"
                      ? col.header({ column: col })
                      : col.header}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody className={bodyClassName}>
            {/* Loading State: Skeletons */}
            {isLoading ? (
              Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
                <TableRow
                  key={`skeleton-row-${rowIndex}`}
                  className={cn(striped && rowIndex % 2 === 1 && "bg-muted/25")}
                >
                  {columns.map((col, colIndex) => {
                    const align = col.align ?? "left";
                    return (
                      <TableCell
                        key={`skeleton-cell-${colIndex}`}
                        style={{
                          width: col.width,
                          minWidth: col.minWidth,
                        }}
                        className={cn(
                          dense ? "p-2" : "p-3",
                          bordered && "border-r last:border-r-0",
                          col.className,
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center",
                            align === "center" && "justify-center",
                            align === "right" && "justify-end",
                          )}
                        >
                          <Skeleton
                            className={cn(
                              "h-4 rounded-sm",
                              colIndex === 0
                                ? "w-16"
                                : colIndex === columns.length - 1
                                  ? "w-20"
                                  : "w-3/4 max-w-[140px]",
                            )}
                          />
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              /* Empty State */
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-44 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
                    <div className="flex size-11 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/80">
                      {emptyIcon ?? <Inbox className="size-5" />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {emptyText}
                      </p>
                      {emptyDescription && (
                        <p className="text-xs text-muted-foreground">
                          {emptyDescription}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              /* Data Rows */
              data.map((row, rowIndex) => {
                const key = getRowId(row, rowIndex);
                return (
                  <TableRow
                    key={key}
                    onClick={() => onRowClick?.(row, rowIndex)}
                    className={getComputedRowClassName(row, rowIndex)}
                  >
                    {columns.map((col, colIndex) => {
                      const align = col.align ?? "left";
                      const value = getRowValue(row, col.accessorKey);

                      return (
                        <TableCell
                          key={
                            col.id ||
                            (col.accessorKey !== undefined
                              ? String(col.accessorKey)
                              : undefined) ||
                            `cell-${colIndex}`
                          }
                          style={{
                            width: col.width,
                            minWidth: col.minWidth,
                          }}
                          className={cn(
                            dense ? "p-2" : "p-3",
                            "align-middle",
                            alignClasses[align],
                            bordered && "border-r last:border-r-0",
                            col.className,
                          )}
                        >
                          {col.cell
                            ? col.cell({
                                row,
                                index: rowIndex,
                                value,
                              })
                            : ((value as React.ReactNode) ?? "—")}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <DataTablePagination
          disabled={pagination.disabled ?? isLoading}
          {...pagination}
        />
      )}
    </div>
  );
}
