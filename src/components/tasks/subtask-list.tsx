import type { Task } from "@/lib/task-queue/types";
import { TaskStatusBadge } from "./task-status-badge";

export function SubtaskList({
  subtasks,
  onSelect,
}: {
  subtasks: Task[];
  onSelect: (taskId: string) => void;
}) {
  if (subtasks.length === 0) return null;

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-gray-700">Subtasks ({subtasks.length})</h4>
      <div className="space-y-1">
        {subtasks.map((sub) => (
          <button
            key={sub.id}
            onClick={() => onSelect(sub.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-left"
          >
            <TaskStatusBadge status={sub.status} />
            <span className="text-sm truncate flex-1">{sub.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
