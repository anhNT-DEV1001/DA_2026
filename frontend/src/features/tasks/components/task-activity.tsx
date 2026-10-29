"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityHistory } from "./task-history";
import { useWorkspaceTaskActivity } from "../hooks";
import type { TaskTimelineProps } from "../types";

/** Lịch sử task của space (hoặc cả workspace nếu không truyền spaceId), giống tab Lịch sử trong drawer */
export function WorkspaceTaskActivity(props: TaskTimelineProps) {
  const [page, setPage] = useState(1);
  const query = useWorkspaceTaskActivity(
    props.workspaceId,
    props.queryKey,
    page,
    props.spaceId,
  );
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Timeline hoạt động</h2>
          <p className="text-sm text-muted-foreground">
            Lịch sử thay đổi của các task, bao gồm task đã xóa. Mới nhất ở
            trên.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw className={query.isFetching ? "animate-spin" : undefined} />
          Tải lại
        </Button>
      </div>
      <ActivityHistory
        history={query}
        page={page}
        setPage={setPage}
        statuses={props.statuses}
        names={props.names}
        showTask
        onOpenTask={props.onOpenTask}
      />
    </section>
  );
}
