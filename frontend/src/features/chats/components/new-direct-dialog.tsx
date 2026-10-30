"use client";

import { useMemo, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { ComboboxPicker } from "@/components/common/combobox-picker";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useWorkspaceMemberList } from "@/features/workspaces/hooks/useWorkspaceMember";
import { useOpenDirect } from "../hooks";
import { MAX_DIRECT_MEMBERS } from "../types";

type Props = {
  workspaceId: number;
  myId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpened: (conversationId: number) => void;
};

/** Chọn 1 người → chat 1-1; nhiều người → nhóm nhỏ (có thể đặt tên) */
export function NewDirectDialog({
  workspaceId,
  myId,
  open,
  onOpenChange,
  onOpened,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const { data, isLoading } = useWorkspaceMemberList(open ? workspaceId : undefined, {
    status: "MS001",
    limit: 100,
  });
  const openDirect = useOpenDirect(workspaceId);

  const items = useMemo(
    () =>
      // API trả mảng khi không phân trang, trả { items, meta } khi có page/limit
      (Array.isArray(data) ? data : (data?.items ?? []))
        .filter((m) => m.user && m.userId !== myId)
        .map((m) => ({ id: m.userId, name: m.user!.fullName || m.user!.username })),
    [data, myId],
  );

  const close = (next: boolean) => {
    if (!next) {
      setSelected([]);
      setName("");
    }
    onOpenChange(next);
  };

  const submit = async () => {
    try {
      const conversation = await openDirect.mutateAsync({
        userIds: selected.map(Number),
        name: selected.length > 1 && name.trim() ? name.trim() : undefined,
      });
      close(false);
      onOpened(conversation.id);
    } catch (error) {
      toast.add({
        title: "Không thể tạo cuộc trò chuyện",
        description: (error as Error).message,
        type: "error",
      });
    }
  };

  const tooMany = selected.length > MAX_DIRECT_MEMBERS - 1;

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title="Tin nhắn mới"
      description="Chọn một người để nhắn riêng, hoặc nhiều người để tạo nhóm."
      icon={<MessageSquarePlus />}
      confirmText="Bắt đầu"
      cancelText="Hủy"
      onConfirm={submit}
      isLoading={openDirect.isPending}
      confirmDisabled={!selected.length || tooMany}
      size="md"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Người nhận</label>
          <ComboboxPicker
            multiSelect
            items={items}
            selectedValues={selected}
            onSelectedValuesChange={setSelected}
            placeholder={isLoading ? "Đang tải thành viên..." : "Chọn thành viên"}
            disabled={isLoading}
            triggerClassName="w-full"
          />
          {tooMany && (
            <p className="text-xs text-destructive">
              Nhóm tối đa {MAX_DIRECT_MEMBERS} người, tính cả bạn.
            </p>
          )}
        </div>
        {selected.length > 1 && (
          <div className="space-y-1.5">
            <label htmlFor="direct-name" className="text-sm font-medium">
              Tên nhóm <span className="text-muted-foreground">(không bắt buộc)</span>
            </label>
            <Input
              id="direct-name"
              value={name}
              maxLength={255}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nhóm thiết kế"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
