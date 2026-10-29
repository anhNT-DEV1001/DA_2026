"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWorkspaceBySlug } from "@/features/workspaces";
import { useSpace } from "@/features/workspaces/hooks";
import {
  SpaceTasks,
  TaskViewToggle,
  useTaskSearchParams,
} from "@/features/tasks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Briefcase, FolderOpen, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuIcon } from "@/features/menus";

export default function SpacePage() {
  const params = useParams<{ slug: string; spaceSlug: string }>();
  const workspaceSlug = params?.slug ? decodeURIComponent(params.slug) : "";
  const spaceId = params?.spaceSlug ? Number(params.spaceSlug) : 0;

  const {
    data: workspace,
    isLoading: wsLoading,
    isError: wsError,
    error: wsErr,
    refetch: wsRefetch,
  } = useWorkspaceBySlug(workspaceSlug);

  const {
    space,
    isLoadingSpace,
    spaceError,
    refetchSpace,
  } = useSpace(workspace?.id ?? 0, spaceId > 0 ? spaceId : undefined);

  const { view, setView } = useTaskSearchParams(spaceId);

  const isLoading = wsLoading || (!!workspace && isLoadingSpace);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 w-full animate-pulse">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (wsError || !workspace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center min-h-[50vh] space-y-4">
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-xs">
          <Briefcase className="size-8" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-xl font-bold tracking-tight">
            Không tìm thấy Workspace
          </h2>
          <p className="text-sm text-muted-foreground">
            {wsErr instanceof Error
              ? wsErr.message
              : `Workspace "${workspaceSlug}" không tồn tại hoặc bạn không có quyền truy cập.`}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => void wsRefetch()}>
            <RefreshCw className="size-3.5" /> Thử lại
          </Button>
          <Link
            href="/workspaces"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5 text-xs")}
          >
            <ArrowLeft className="size-3.5" /> Quay lại
          </Link>
        </div>
      </div>
    );
  }

  if (spaceError || !space) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center min-h-[50vh] space-y-4">
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-xs">
          <FolderOpen className="size-8" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-xl font-bold tracking-tight">
            Không tìm thấy Space
          </h2>
          <p className="text-sm text-muted-foreground">
            {spaceError instanceof Error
              ? spaceError.message
              : "Space này không tồn tại hoặc bạn không có quyền truy cập."}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetchSpace()}
          >
            <RefreshCw className="size-3.5" /> Thử lại
          </Button>
          <Link
            href={`/workspaces/${workspaceSlug}?tab=spaces`}
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5 text-xs")}
          >
            <ArrowLeft className="size-3.5" /> Quay lại Spaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 w-full">
      {/* Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspaces/${workspaceSlug}?tab=spaces`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "size-8 rounded-lg text-muted-foreground hover:text-foreground",
            )}
            title="Quay lại danh sách spaces"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {space.icon ? (
                <MenuIcon name={space.icon} className="size-4 text-primary" />
              ) : (
                <FolderOpen className="size-4 text-primary" />
              )}
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                {space.name}
              </h1>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {workspace.name} / {space.name}
            </span>
          </div>
        </div>
        <TaskViewToggle
          value={view}
          onChange={setView}
          className="self-end sm:self-auto"
        />
      </div>

      {space.description && (
        <p className="text-sm text-muted-foreground -mt-3">
          {space.description}
        </p>
      )}

      <SpaceTasks workspace={workspace} space={space} view={view} />
    </div>
  );
}
