export interface RealtimeEnvelope<T = unknown> {
  channel: string; // 'notification' hoặc 'order:123'
  event: string; // 'created', 'status_changed', ...
  data: T;
  ts: string;
}

export interface ChannelDefinition {
  name: string; // tên kênh, ví dụ 'order'
  authorize?: (userId: number | string, param?: string) => Promise<boolean>;
}
