import { apiClient } from "@/lib/axios";
import type {
  LoginDto,
  LoginResponse,
  RegisterDto,
  UserProfile,
  AuthUserResponse,
  RefreshResponse,
} from "../types";

export const authService = {
  login: async (dto: LoginDto): Promise<LoginResponse> => {
    return apiClient.post<unknown, LoginResponse>("/auth/login", dto);
  },

  register: async (data: RegisterDto | FormData): Promise<UserProfile> => {
    const isFormData =
      typeof FormData !== "undefined" && data instanceof FormData;
    return apiClient.post<unknown, UserProfile>("/auth/register", data, {
      headers: isFormData
        ? { "Content-Type": "multipart/form-data" }
        : { "Content-Type": "application/json" },
    });
  },

  getMe: async (): Promise<AuthUserResponse> => {
    return apiClient.get<unknown, AuthUserResponse>("/auth/me");
  },

  logout: async (): Promise<UserProfile> => {
    return apiClient.post<unknown, UserProfile>("/auth/logout");
  },

  refresh: async (): Promise<RefreshResponse> => {
    return apiClient.post<unknown, RefreshResponse>("/auth/refresh");
  },

  updateProfile: async (
    id: number,
    data: FormData | Partial<UserProfile>,
  ): Promise<UserProfile> => {
    const isFormData =
      typeof FormData !== "undefined" && data instanceof FormData;
    return apiClient.patch<unknown, UserProfile>(`/users/${id}`, data, {
      headers: isFormData
        ? { "Content-Type": "multipart/form-data" }
        : { "Content-Type": "application/json" },
    });
  },
};
