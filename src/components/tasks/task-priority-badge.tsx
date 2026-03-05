import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@/lib/task-queue/types";

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 hover:bg-red-100" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  normal: { label: "Normal", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  low: { label: "Low", className: "bg-gray-100 text-gray-500 hover:bg-gray-100" },
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = priorityConfig[priority];
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}
