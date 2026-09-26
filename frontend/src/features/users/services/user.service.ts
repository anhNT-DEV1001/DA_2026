import { apiClient } from "@/lib/axios";
import type {
  CreateUserDto,
  PaginatedUserResponse,
  UpdateUserDto,
  UserItem,
  UserQueryParams,
} from "../types";

/**
 * Chuyển đổi DTO người dùng sang FormData để hỗ trợ upload file avatar cùng dữ liệu
 */
export function buildUserFormData(
  dto: Partial<CreateUserDto | UpdateUserDto>,
): FormData {
  const formData = new FormData();

  Object.entries(dto).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (key === "avatar") {
      if (
        typeof window !== "undefined" &&
        (value instanceof File || value instanceof Blob)
      ) {
        formData.append("avatar", value);
      } else if (typeof value === "string") {
        formData.append("avatar", value);
      }
    } else if (key === "roleIds" && Array.isArray(value)) {
      formData.append("roleIds", JSON.stringify(value));
    } else if (key === "dob") {
      if (value instanceof Date) {
        formData.append("dob", value.toISOString());
      } else {
        formData.append("dob", String(value));
      }
    } else {
      formData.append(key, String(value));
    }
  });

  return formData;
}

export const userService = {
  /**
   * Lấy thông tin chi tiết người dùng theo ID (kèm roles)
   * GET /users/:id
   */
  getUserById: async (id: number): Promise<UserItem> => {
    return apiClient.get<unknown, UserItem>(`/users/${id}`);
  },

  /**
   * Lấy danh sách người dùng (hỗ trợ phân trang và tìm kiếm)
   * GET /users
   */
  getListUsers: async (
    params?: UserQueryParams,
  ): Promise<PaginatedUserResponse | UserItem[]> => {
    return apiClient.get<unknown, PaginatedUserResponse | UserItem[]>(
      "/users",
      {
        params,
      },
    );
  },

  /**
   * Tạo người dùng mới
   * POST /users
   * Tự động nhận diện nếu dữ liệu là FormData hoặc có chứa File avatar để gửi multipart/form-data
   */
  createUser: async (data: CreateUserDto | FormData): Promise<UserItem> => {
    const isFormData =
      typeof FormData !== "undefined" && data instanceof FormData;
    const hasFileAvatar =
      !isFormData &&
      typeof (data as CreateUserDto).avatar === "object" &&
      (data as CreateUserDto).avatar !== null;

    if (isFormData) {
      return apiClient.post<unknown, UserItem>("/users", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    if (hasFileAvatar) {
      const formData = buildUserFormData(data as CreateUserDto);
      return apiClient.post<unknown, UserItem>("/users", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    return apiClient.post<unknown, UserItem>("/users", data);
  },

  /**
   * Cập nhật thông tin người dùng
   * PATCH /users/:id
   * Tự động nhận diện nếu dữ liệu là FormData hoặc có chứa File avatar để gửi multipart/form-data
   */
  updateUser: async (
    id: number,
    data: UpdateUserDto | FormData,
  ): Promise<UserItem> => {
    const isFormData =
      typeof FormData !== "undefined" && data instanceof FormData;
    const hasFileAvatar =
      !isFormData &&
      typeof (data as UpdateUserDto).avatar === "object" &&
      (data as UpdateUserDto).avatar !== null;

    if (isFormData) {
      return apiClient.patch<unknown, UserItem>(`/users/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    if (hasFileAvatar) {
      const formData = buildUserFormData(data as UpdateUserDto);
      return apiClient.patch<unknown, UserItem>(`/users/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    return apiClient.patch<unknown, UserItem>(`/users/${id}`, data);
  },

  /**
   * Xóa người dùng (soft delete)
   * DELETE /users/:id
   */
  deleteUser: async (id: number): Promise<UserItem> => {
    return apiClient.delete<unknown, UserItem>(`/users/${id}`);
  },
};
