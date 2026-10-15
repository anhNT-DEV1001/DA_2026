"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  WorkspaceInfo,
  WorkspaceMember,
  useWorkspaceBySlug,
} from "@/features/workspaces";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Briefcase,
  Globe,
  Info,
  Lock,
  RefreshCw,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "info" | "members";

export default function WorkspaceDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ? decodeURIComponent(params.slug) : "";

  // Lấy tab từ URL query param nếu có (ví dụ ?tab=members), mặc định là 'info'
  const tabFromUrl = searchParams.get("tab") as TabKey | null;
  const [activeTab, setActiveTab] = React.useState<TabKey>(
    tabFromUrl === "members" ? "members" : "info",
  );

  // Khi URL searchParams thay đổi tab thì sync vào state
  React.useEffect(() => {
    if (tabFromUrl === "info" || tabFromUrl === "members") {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    // Cập nhật URL query param mà không reload trang
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", tab);
    router.replace(`?${newParams.toString()}`, { scroll: false });
  };

  // Fetch chi tiết workspace theo slug (lấy được id workspace, owner, members,...)
  const {
    data: workspace,
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkspaceBySlug(slug);

  // Trạng thái Loading
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 w-full  animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Banner Skeleton */}
        <Skeleton className="h-36 w-full rounded-2xl" />

        {/* Tabs Skeleton */}
        <div className="flex gap-2 border-b pb-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  // Trạng thái Không tìm thấy workspace
  if (isError || !workspace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center min-h-[50vh] space-y-4">
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-xs">
          <Briefcase className="size-8" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Không tìm thấy Không gian làm việc
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : `Workspace với định danh "${slug}" không tồn tại hoặc bạn không có quyền truy cập.`}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs font-medium"
          >
            <RefreshCw className="size-3.5" /> Thử lại
          </Button>
          <Link
            href="/workspaces"
            className={cn(
              buttonVariants({ size: "sm" }),
              "gap-1.5 text-xs font-medium",
            )}
          >
            <ArrowLeft className="size-3.5" /> Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const modeLabel =
    workspace.modeName || workspace.modeData?.name || workspace.mode;
  const isPublic =
    workspace.mode === "public" ||
    workspace.mode === "WSM002" ||
    (modeLabel
      ? modeLabel.toLowerCase().includes("public") ||
        modeLabel.toLowerCase().includes("công khai")
      : false);
  const memberCount = workspace.members?.length ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 w-full">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Link
            href="/workspaces"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "size-8 rounded-lg text-muted-foreground hover:text-foreground",
            )}
            title="Quay lại danh sách workspace"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {workspace.name}
              </h1>
              {/* <Badge
                variant="outline"
                className="text-[11px] font-mono py-0 px-2 bg-muted/50"
              >
                ID: #{workspace.id}
              </Badge> */}
              {workspace.isStar && (
                <Star className="size-4 fill-amber-400 text-amber-500" />
              )}
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              /workspaces/{workspace.slug || workspace.id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
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
      </div>

      {/* Tabs Switcher: Tab 1 - Thông tin, Tab 2 - Thành viên */}
      <div className="flex items-center gap-1 border-b border-border select-none">
        {/* Tab 1: Thông tin */}
        <button
          type="button"
          onClick={() => handleTabChange("info")}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors focus:outline-none cursor-pointer",
            activeTab === "info"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Info className="size-4" />
          <span>Thông tin</span>
          {activeTab === "info" && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-t-sm" />
          )}
        </button>

        {/* Tab 2: Thành viên */}
        <button
          type="button"
          onClick={() => handleTabChange("members")}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors focus:outline-none cursor-pointer",
            activeTab === "members"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="size-4" />
          <span>Thành viên</span>
          {memberCount > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono transition-colors",
                activeTab === "members"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {memberCount}
            </span>
          )}
          {activeTab === "members" && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-t-sm" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="w-full">
        {activeTab === "info" ? (
          /* Tab 1: Hiển thị thông tin Workspace */
          <WorkspaceInfo workspace={workspace} />
        ) : (
          /* Tab 2: Quản lý thành viên trong Workspace theo Workspace ID */
          <WorkspaceMember
            workspaceId={workspace.id}
            workspaceName={workspace.name}
          />
        )}
      </div>
    </div>
  );
}
