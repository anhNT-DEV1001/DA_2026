"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceItem } from "../types";
import { WorkspaceDetailModal } from "./workspace-detail";
import {
  Briefcase,
  Calendar,
  Globe,
  Hash,
  Lock,
  Pencil,
  ShieldAlert,
  Star,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  canEdit = true,
  className,
}: WorkspaceInfoProps) {
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
    <div className={cn("space-y-6 w-full", className)}>
      {/* Overview Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-bold text-xl shadow-xs">
              {getInitials(workspace.name)}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
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

              <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                <span>Đường dẫn slug:</span>
                <span className="text-foreground font-semibold">
                  /workspaces/{workspace.slug || workspace.id}
                </span>
              </p>
            </div>
          </div>

          {canEdit && (
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

        {/* Mô tả */}
        {workspace.description && (
          <div className="mt-5 pt-4 border-t border-border/60">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {workspace.description}
            </p>
          </div>
        )}
      </div>

      {/* Grid chi tiết các trường thông tin */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card: Chủ sở hữu (Owner) */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <User className="size-4 text-primary" />
              Chủ sở hữu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workspace.owner ? (
              <div className="flex items-center gap-3">
                <Avatar size="sm" className="size-10 border border-border">
                  {workspace.owner.avatar && (
                    <AvatarImage
                      src={workspace.owner.avatar}
                      alt={workspace.owner.fullName || workspace.owner.username}
                    />
                  )}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {getInitials(
                      workspace.owner.fullName || workspace.owner.username,
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {workspace.owner.fullName || workspace.owner.username}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {workspace.owner.email || `@${workspace.owner.username}`}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Chưa có thông tin chủ sở hữu
              </span>
            )}
          </CardContent>
        </Card>

        {/* Card: Tổng số thành viên */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Users className="size-4 text-primary" />
              Thành viên
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {workspace.members?.length ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">
                người dùng tham gia
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Quản lý phân quyền và danh sách thành viên ở tab Thành viên.
            </p>
          </CardContent>
        </Card>

        {/* Card: Thứ tự hiển thị & ID */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Hash className="size-4 text-primary" />
              Mã hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Workspace ID:</span>
              <span className="font-mono font-semibold text-foreground">
                #{workspace.id}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Thứ tự hiển thị:</span>
              <span className="font-mono font-semibold text-foreground">
                {workspace.displayOrder ?? 1}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card: Thời gian khởi tạo */}
        <Card className="shadow-xs md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4 text-primary" />
              Lịch sử ghi nhận
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Ngày tạo:</span>
                <span className="font-medium text-foreground">
                  {formatDate(workspace.createdAt)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">
                  Cập nhật lần cuối:
                </span>
                <span className="font-medium text-foreground">
                  {formatDate(workspace.updatedAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal cập nhật workspace */}
      <WorkspaceDetailModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        workspace={workspace}
      />
    </div>
  );
}
