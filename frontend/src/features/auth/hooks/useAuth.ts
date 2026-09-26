"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { authService } from "../services";
import type { LoginDto, RegisterDto, UserProfile } from "../types";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const permissions = useAuthStore((s) => s.permissions);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const hasRole = useAuthStore((s) => s.hasRole);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const loginMutation = useMutation({
    mutationFn: (dto: LoginDto) => authService.login(dto),
    onSuccess: async (data) => {
      // Cập nhật thông tin user ngay từ response của login
      setAuth({ user: data.user });
      // Lấy đầy đủ roles và permissions từ /auth/me
      await fetchMe();
      queryClient.invalidateQueries({ queryKey: ["auth_me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (dto: RegisterDto | FormData) => authService.register(dto),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await authService.logout();
      } catch (error) {
        console.warn(
          "Logout API call error, completing client cleanup:",
          error,
        );
      }
    },
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      router.push("/login");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: FormData | Partial<UserProfile>;
    }) => authService.updateProfile(id, data),
    onSuccess: async (updatedUser) => {
      setAuth({ user: updatedUser, roles, permissions });
      await fetchMe();
      queryClient.invalidateQueries({ queryKey: ["auth_me"] });
    },
  });

  return {
    // Auth State
    user,
    roles,
    permissions,
    isAuthenticated,
    isInitialized,
    hasRole,
    hasPermission,
    fetchMe,

    // React Query Mutations
    loginMutation,
    registerMutation,
    logoutMutation,
    updateProfileMutation,

    // Shorthand actions
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,

    // Status flags
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    updateProfileError: updateProfileMutation.error,
  };
}
