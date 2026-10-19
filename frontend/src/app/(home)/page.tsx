"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useMyWorkspaces } from "@/features/workspaces";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Page() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const permissions = useAuthStore((state) => state.permissions);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const { data: workspaces, isPending, error, refetch, isFetching } = useMyWorkspaces();
  const canViewWorkspaces = hasPermission("WORKSPACE_VIEW");

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Trang chủ</h1>
          <p className="mt-2 text-muted-foreground">
            {user ? `Xin chào, ${user.fullName || user.username}.` : "Chào mừng bạn đến với DA System."}
          </p>
        </div>
        <Link href="/personal" className={buttonVariants({ variant: "outline" })}>
          Hồ sơ cá nhân
        </Link>
      </div>

      {isInitialized && user && permissions.length === 0 && (
        <section className="rounded-lg border bg-muted/30 p-5" aria-label="Quyền truy cập">
          <h2 className="font-medium">Tài khoản chưa được cấp quyền</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bạn đã đăng nhập thành công. Liên hệ quản trị viên để được cấp quyền
            truy cập workspace và các menu chức năng.
          </p>
        </section>
      )}

      <section className="rounded-lg border p-5" aria-labelledby="my-workspaces-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="my-workspaces-title" className="text-lg font-semibold">Workspace của tôi</h2>
          {canViewWorkspaces && (
            <Link href="/workspaces" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Quản lý workspace
            </Link>
          )}
        </div>
        {!isInitialized || isPending ? (
          <p className="mt-4 text-sm text-muted-foreground" role="status">Đang tải workspace…</p>
        ) : error ? (
          <div className="mt-4 space-y-3" role="alert">
            <p className="text-sm text-destructive">Không tải được workspace: {error.message}</p>
            <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
              Thử lại
            </Button>
          </div>
        ) : !workspaces?.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Bạn chưa tham gia workspace nào.
            {hasPermission("WORKSPACE_CREATE")
              ? " Mở trang quản lý workspace để tạo workspace đầu tiên."
              : " Khi được thêm vào workspace, danh sách sẽ xuất hiện tại đây."}
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <li key={workspace.id} className="rounded-lg border p-4">
                {canViewWorkspaces ? (
                  <Link href={`/workspaces/${encodeURIComponent(workspace.slug)}`} className="font-medium hover:underline">
                    {workspace.name}
                  </Link>
                ) : <p className="font-medium">{workspace.name}</p>}
                <p className="mt-2 text-sm text-muted-foreground">{workspace.description || "Chưa có mô tả."}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
