"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { TaskStatus, TaskPriority } from "@/lib/task-queue/types";

export function TaskToolbar({
  statusFilter,
  priorityFilter,
  onStatusChange,
  onPriorityChange,
  onCreateTask,
}: {
  statusFilter: TaskStatus | "all";
  priorityFilter: TaskPriority | "all";
  onStatusChange: (v: TaskStatus | "all") => void;
  onPriorityChange: (v: TaskPriority | "all") => void;
  onCreateTask: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3 border-b">
      <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as TaskStatus | "all")}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="todo">Todo</SelectItem>
          <SelectItem value="queued">Queued</SelectItem>
          <SelectItem value="in_progress">Running</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select value={priorityFilter} onValueChange={(v) => onPriorityChange(v as TaskPriority | "all")}>
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex-1" />

      <Button size="sm" onClick={onCreateTask} className="h-8">
        <Plus className="h-4 w-4 mr-1" />
        New Task
      </Button>
    </div>
  );
}
