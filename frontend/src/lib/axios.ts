import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export const apiClient = axios.create({
  baseURL: "/api/v1", // Đi qua Next.js proxy rewrite
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Queue quản lý request khi đang refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Trả về data bên trong cấu trúc SuccessResponse của backend
    return response.data?.data !== undefined
      ? response.data.data
      : response.data;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Bỏ qua lỗi từ login, refresh hoặc logout để tránh lặp vô tận
    const isAuthRoute =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/logout");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Backend sẽ đọc refreshToken từ cookie và cấp cặp cookie mới
        await axios.post("/api/v1/auth/refresh", {}, { withCredentials: true });
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Xóa sạch trạng thái xác thực trong Zustand store & localStorage
        try {
          const { useAuthStore } = await import("@/stores/auth-store");
          useAuthStore.getState().clearAuth();
        } catch {
          // Bỏ qua nếu môi trường chưa sẵn sàng
        }

        // Dispatch event hoặc gọi store logout khi phiên đăng nhập thực sự hết hạn
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:unauthorized"));
          if (
            !window.location.pathname.startsWith("/login") &&
            !window.location.pathname.startsWith("/register")
          ) {
            const returnUrl = encodeURIComponent(
              `${window.location.pathname}${window.location.search}`,
            );
            window.location.href = `/login?returnUrl=${returnUrl}`;
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Trích xuất error message từ backend ErrorResponse
    const backendMessage = error.response?.data?.message;
    const errorMessage = Array.isArray(backendMessage)
      ? backendMessage.join(", ")
      : backendMessage || error.message || "Đã có lỗi xảy ra";

    return Promise.reject(new Error(errorMessage));
  },
);
