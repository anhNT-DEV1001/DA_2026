"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { WorkspaceItem } from "../../types";
import { WorkspaceDetailModal } from "./workspace-detail";
import {
  Calendar,
  Globe,
  Layers,
  Lock,
  Pencil,
  Star,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export interface WorkspaceInfoProps {
  workspace: WorkspaceItem;
  canEdit?: boolean;
  className?: string;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function getInitials(name?: string | null): string {
  if (!name) return "W";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function WorkspaceInfo({
  workspace,
  canEdit,
  className,
}: WorkspaceInfoProps) {
  const permissions = useAuthStore((s) => s.permissions);
  const hasUpdatePermission = React.useMemo(
    () => permissions.some((p) => p.code === "WORKSPACE_UPDATE"),
    [permissions],
  );
  const allowEdit = canEdit ?? hasUpdatePermission;
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const modeLabel =
    workspace.modeName || workspace.modeData?.name || workspace.mode;
  const isPublic =
    workspace.mode === "public" ||
    workspace.mode === "WSM002" ||
    (modeLabel
      ? modeLabel.toLowerCase().includes("public") ||
        modeLabel.toLowerCase().includes("công khai")
      : false);

  return (
    <div className={cn("w-full", className)}>
      <Card className="relative overflow-hidden border border-border bg-card shadow-xs">
        <CardContent className="p-6 space-y-6">
          {/* Header Workspace */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-bold text-xl shadow-xs">
                {getInitials(workspace.name)}
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                    {workspace.name}
                  </h2>

                  {workspace.isStar && (
                    <Badge
                      variant="outline"
                      className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs px-2"
                    >
                      <Star className="size-3 fill-amber-400" />
                      Yêu thích
                    </Badge>
                  )}

                  {modeLabel && (
                    <Badge
                      variant={isPublic ? "secondary" : "outline"}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full",
                        isPublic
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
                      )}
                    >
                      {isPublic ? (
                        <Globe className="size-3" />
                      ) : (
                        <Lock className="size-3" />
                      )}
                      {modeLabel}
                    </Badge>
                  )}
                </div>

                {workspace.slug && (
                  <p className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                    <span>Đường dẫn (Slug):</span>
                    <span className="text-foreground font-semibold bg-muted/60 px-1.5 py-0.5 rounded">
                      /{workspace.slug}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {allowEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(true)}
                className="gap-1.5 text-xs font-medium shrink-0"
              >
                <Pencil className="size-3.5" />
                Chỉnh sửa thông tin
              </Button>
            )}
          </div>

          {/* Mô tả workspace nếu có */}
          {workspace.description && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {workspace.description}
              </p>
            </div>
          )}

          {/* Đường kẻ phân cách */}
          <div className="border-t border-border/60" />

          {/* Grid các trường thông tin chi tiết */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Chủ sở hữu */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-border/60 bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <User className="size-3.5 text-primary" />
                <span>Chủ sở hữu</span>
              </div>
              {workspace.owner ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    size="sm"
                    className="size-9 border border-border shrink-0"
                  >
                    {workspace.owner.avatar && (
                      <AvatarImage
                        src={workspace.owner.avatar}
                        alt={
                          workspace.owner.fullName || workspace.owner.username
                        }
                      />
                    )}
                    <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                      {getInitials(
                        workspace.owner.fullName || workspace.owner.username,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {workspace.owner.fullName || workspace.owner.username}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {workspace.owner.email || `@${workspace.owner.username}`}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Chưa có thông tin
                </span>
              )}
            </div>

            {/* 2. Tổng số thành viên */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-border/60 bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Users className="size-3.5 text-primary" />
                <span>Thành viên</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">
                  {workspace.members?.length ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  người tham gia
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground truncate">
                Quản lý quyền tại tab Thành viên
              </span>
            </div>

            {/* 3. Thứ tự hiển thị */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-border/60 bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Layers className="size-3.5 text-primary" />
                <span>Thứ tự hiển thị</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {workspace.displayOrder ?? 1}
                </span>
                <span className="text-xs text-muted-foreground">
                  thứ tự ưu tiên
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground truncate">
                Sắp xếp danh sách workspace
              </span>
            </div>

            {/* 4. Thời gian khởi tạo & cập nhật */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-border/60 bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Calendar className="size-3.5 text-primary" />
                <span>Thời gian</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Tạo lúc:</span>
                  <span className="font-medium text-foreground">
                    {formatDate(workspace.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Cập nhật:</span>
                  <span className="font-medium text-foreground">
                    {formatDate(workspace.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal cập nhật workspace */}
      <WorkspaceDetailModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        workspace={workspace}
      />
    </div>
  );
}
