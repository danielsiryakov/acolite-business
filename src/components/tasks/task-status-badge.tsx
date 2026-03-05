import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/lib/task-queue/types";

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: "Todo", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
  queued: { label: "Queued", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  in_progress: { label: "Running", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500 hover:bg-gray-100" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 hover:bg-red-100" },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}
