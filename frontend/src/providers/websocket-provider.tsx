"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { apiClient } from "@/lib/axios";
import { useAuthStore } from "@/stores/auth-store";

/** Khớp với RealtimeEnvelope ở backend (infrastructure/websockets/interfaces) */
export type Envelope<T = unknown> = {
  channel: string; // 'notification' (room user) hoặc topic dạng 'task:123'
  event: string; // 'created', 'status_changed', ...
  data: T;
  ts: string;
};
type Handler<T = unknown> = (env: Envelope<T>) => void;

export type SubscribeResult = {
  ok: boolean;
  error?:
    | "UNAUTHORIZED"
    | "UNKNOWN_CHANNEL"
    | "FORBIDDEN"
    | "NOT_CONNECTED"
    | "TIMEOUT";
};

export type ConnectionStatus =
  "idle" | "connecting" | "connected" | "disconnected";

type RealtimeCtx = {
  status: ConnectionStatus;
  on: <T = unknown>(channel: string, fn: Handler<T>) => () => void;
  subscribe: (topic: string) => Promise<SubscribeResult>;
  unsubscribe: (topic: string) => void;
};

// Channel đặc biệt nhận mọi message
export const ANY_CHANNEL = "*";

const ACK_TIMEOUT_MS = 5000;
// Số lần thử lại tối đa khi server chủ động ngắt kết nối (thường do access token hết hạn)
const MAX_AUTH_RETRIES = 3;
// Giữ kết nối ổn định trong khoảng này thì coi như xác thực thành công
const STABLE_CONNECTION_MS = 5000;

const Ctx = createContext<RealtimeCtx | null>(null);

export function WebsocketProvider({ children }: { children: ReactNode }) {
  // Access token nằm trong HttpOnly cookie nên chỉ cần biết đã đăng nhập hay chưa
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const enabled = isInitialized && isAuthenticated && userId != null;

  const [socketStatus, setStatus] = useState<ConnectionStatus>("connecting");
  const status: ConnectionStatus = enabled ? socketStatus : "idle";
  const socketRef = useRef<Socket | null>(null);
  const listeners = useRef(new Map<string, Set<Handler>>());
  // topic -> số component đang subscribe (tránh component này unsubscribe mất topic của component khác)
  const topics = useRef(new Map<string, number>());

  useEffect(() => {
    if (!enabled) return;

    const s = io(`${process.env.NEXT_PUBLIC_API_URL}/realtime`, {
      // Gửi kèm cookie accessToken để backend xác thực ở handshake
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = s;

    let authRetries = 0;
    let stableTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    s.on("connect", () => {
      setStatus("connected");
      stableTimer = setTimeout(() => (authRetries = 0), STABLE_CONNECTION_MS);

      // Sau khi (re)connect, đăng ký lại các topic đang theo dõi
      topics.current.forEach((_, topic) => {
        s.timeout(ACK_TIMEOUT_MS)
          .emitWithAck("subscribe", { topic })
          .then((res: SubscribeResult) => {
            if (!res?.ok) {
              console.warn(
                `[realtime] Subscribe lại "${topic}" thất bại:`,
                res?.error,
              );
              topics.current.delete(topic);
            }
          })
          .catch(() => {
            // Timeout: lần reconnect sau sẽ thử lại
          });
      });
    });

    s.on("disconnect", (reason) => {
      clearTimeout(stableTimer);
      setStatus("disconnected");

      // Các lý do khác (mất mạng, server restart...) socket.io tự reconnect.
      // "io server disconnect" nghĩa là backend từ chối xác thực -> socket.io KHÔNG tự reconnect,
      // nên làm mới token qua HTTP (interceptor tự gọi /auth/refresh) rồi kết nối lại.
      if (reason !== "io server disconnect") return;
      if (authRetries >= MAX_AUTH_RETRIES) {
        console.warn(
          "[realtime] Xác thực websocket thất bại nhiều lần, dừng kết nối lại.",
        );
        return;
      }
      authRetries += 1;

      apiClient
        .get("/auth/me")
        .then(() => {
          if (disposed) return;
          setStatus("connecting");
          retryTimer = setTimeout(() => s.connect(), 1000 * authRetries);
        })
        .catch(() => {
          // Refresh thất bại: axios interceptor đã xử lý chuyển về trang đăng nhập
        });
    });

    s.on("connect_error", (err) => {
      setStatus("disconnected");
      console.warn("[realtime] Lỗi kết nối:", err.message);
    });

    s.on("message", (env: Envelope) => {
      listeners.current.get(env.channel)?.forEach((fn) => fn(env));
      listeners.current.get(ANY_CHANNEL)?.forEach((fn) => fn(env));
    });

    return () => {
      disposed = true;
      clearTimeout(stableTimer);
      clearTimeout(retryTimer);
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
      setStatus("connecting");
    };
  }, [enabled, userId]);

  // Đăng xuất / đổi tài khoản thì bỏ toàn bộ topic cũ
  useEffect(() => {
    if (!enabled) topics.current.clear();
  }, [enabled]);

  const on = useCallback(<T,>(channel: string, fn: Handler<T>) => {
    if (!listeners.current.has(channel))
      listeners.current.set(channel, new Set());
    const set = listeners.current.get(channel)!;
    set.add(fn as Handler);
    return () => {
      set.delete(fn as Handler);
      if (set.size === 0) listeners.current.delete(channel);
    };
  }, []);

  const subscribe = useCallback(
    async (topic: string): Promise<SubscribeResult> => {
      const count = topics.current.get(topic) ?? 0;
      topics.current.set(topic, count + 1);
      // Đã có component khác subscribe topic này rồi
      if (count > 0) return { ok: true };

      const s = socketRef.current;
      // Chưa kết nối: topic được giữ lại và sẽ subscribe khi "connect"
      if (!s || !s.connected) return { ok: false, error: "NOT_CONNECTED" };

      try {
        const res: SubscribeResult = await s
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck("subscribe", { topic });
        if (!res?.ok) topics.current.delete(topic);
        return res;
      } catch {
        return { ok: false, error: "TIMEOUT" };
      }
    },
    [],
  );

  const unsubscribe = useCallback((topic: string) => {
    const count = topics.current.get(topic);
    if (!count) return;
    if (count > 1) {
      topics.current.set(topic, count - 1);
      return;
    }
    topics.current.delete(topic);
    socketRef.current?.emit("unsubscribe", { topic });
  }, []);

  const value = useMemo(
    () => ({ status, on, subscribe, unsubscribe }),
    [status, on, subscribe, unsubscribe],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRealtime() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRealtime phải nằm trong WebsocketProvider");
  return ctx;
}

/**
 * Lắng nghe message của một channel.
 * - Channel gửi theo user (vd: 'notification'): chỉ cần lắng nghe, không subscribe.
 * - Channel dạng topic (vd: 'task:123'): truyền { subscribe: true } để join room trên server.
 *
 * @example
 * useRealtimeChannel<Notification>("notification", (env) => {
 *   if (env.event === "created") queryClient.invalidateQueries({ queryKey: ["notifications"] });
 * });
 */
export function useRealtimeChannel<T = unknown>(
  channel: string | null | undefined,
  handler: Handler<T>,
  options: { subscribe?: boolean } = {},
) {
  const { on, subscribe, unsubscribe } = useRealtime();
  const shouldSubscribe = options.subscribe ?? false;
  // Giữ handler mới nhất mà không phải đăng ký lại listener mỗi lần render
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!channel) return;
    const off = on<T>(channel, (env) => handlerRef.current(env));
    if (shouldSubscribe) {
      subscribe(channel).then((res) => {
        if (!res.ok && res.error !== "NOT_CONNECTED") {
          console.warn(
            `[realtime] Subscribe "${channel}" thất bại:`,
            res.error,
          );
        }
      });
    }
    return () => {
      off();
      if (shouldSubscribe) unsubscribe(channel);
    };
  }, [channel, shouldSubscribe, on, subscribe, unsubscribe]);
}
