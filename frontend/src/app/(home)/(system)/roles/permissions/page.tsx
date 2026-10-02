"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MenuPermissionMatrix } from "@/features/menus";
import { Loader2 } from "lucide-react";

function RolePermissionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const roleIdParam = searchParams.get("roleId");
  const roleName = searchParams.get("roleName") || "";
  const roleId = roleIdParam ? Number(roleIdParam) : undefined;

  const handleBack = () => {
    router.push("/roles");
  };

  return (
    <MenuPermissionMatrix
      roleId={roleId}
      roleName={roleName}
      onBack={handleBack}
    />
  );
}

export default function RolePermissionPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-xs text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>Đang tải trang phân quyền...</span>
        </div>
      }
    >
      <RolePermissionContent />
    </React.Suspense>
  );
}
