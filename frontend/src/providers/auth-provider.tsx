"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    // 1. Xác thực lại session qua HttpOnly cookie với backend
    fetchMe();

    // 2. Lắng nghe tín hiệu session hết hạn từ axios interceptor
    const handleUnauthorized = () => {
      clearAuth();
      router.push("/login");
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [fetchMe, clearAuth, router]);

  return <>{children}</>;
}
