import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserProfile, Role, Permission } from "@/features/auth";
import { authService } from "@/features/auth";

interface AuthState {
  user: UserProfile | null;
  roles: Role[];
  permissions: Permission[];
  isAuthenticated: boolean;
  isInitialized: boolean;

  setAuth: (data: {
    user: UserProfile;
    roles?: Role[];
    permissions?: Permission[];
  }) => void;
  clearAuth: () => void;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  hasPermission: (permissionCode: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      roles: [],
      permissions: [],
      isAuthenticated: false,
      isInitialized: false,

      setAuth: ({ user, roles = [], permissions = [] }) =>
        set({
          user,
          roles,
          permissions,
          isAuthenticated: true,
          isInitialized: true,
        }),

      clearAuth: () =>
        set({
          user: null,
          roles: [],
          permissions: [],
          isAuthenticated: false,
          isInitialized: true,
        }),

      fetchMe: async () => {
        try {
          const data = await authService.getMe();
          get().setAuth({
            user: data.user,
            roles: data.roles || [],
            permissions: data.permissions || [],
          });
        } catch {
          get().clearAuth();
        }
      },

      logout: async () => {
        try {
          // Gọi backend để xoá session trong DB và xoá cookies
          await authService.logout();
        } catch (error) {
          console.error("Logout error", error);
        } finally {
          get().clearAuth();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth:unauthorized"));
          }
        }
      },

      hasRole: (roleName: string) => {
        return get().roles.some(
          (r) => r.name.toLowerCase() === roleName.toLowerCase(),
        );
      },

      hasPermission: (permissionCode: string) => {
        return get().permissions.some((p) => p.code === permissionCode);
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Chỉ persist thông tin profile để render nhanh giao diện, không lưu flag nhạy cảm
      partialize: (state) => ({
        user: state.user,
        roles: state.roles,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
