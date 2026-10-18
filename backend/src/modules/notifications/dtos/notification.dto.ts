export class CreateNotificationDto {
  type: string;
  title: string;
  content?: string | null;
  // Người gây ra sự kiện (null nếu do hệ thống/cron)
  actorId?: number | null;
  workspaceId?: number | null;
  entityType?: string | null;
  entityId?: number | null;
  // Snapshot dữ liệu để FE render/điều hướng
  data?: Record<string, unknown> | null;
}
