"use client";

import type { Task } from "@/lib/task-queue/types";
import { TaskStatusBadge } from "./task-status-badge";
import { TaskPriorityBadge } from "./task-priority-badge";
import { Clock, Repeat, CalendarClock } from "lucide-react";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function TaskListItem({
  task,
  selected,
  onClick,
}: {
  task: Task;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-transparent hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm truncate flex-1">{task.title}</h4>
        {task.priority !== "normal" && <TaskPriorityBadge priority={task.priority} />}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <TaskStatusBadge status={task.status} />
        {task.schedule_type && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            {task.schedule_type === "interval" ? (
              <Repeat className="h-3 w-3" />
            ) : (
              <CalendarClock className="h-3 w-3" />
            )}
            {task.schedule_type}
          </span>
        )}
        <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
          <Clock className="h-3 w-3" />
          {timeAgo(task.updated_at)}
        </span>
      </div>
    </button>
  );
}
