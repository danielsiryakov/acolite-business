"use client";

import type { Task } from "@/lib/task-queue/types";
import { TaskListItem } from "./task-list-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks } from "lucide-react";

export function TaskList({
  tasks,
  selectedId,
  onSelect,
}: {
  tasks: Task[];
  selectedId: string | null;
  onSelect: (taskId: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
        <ListChecks className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">No tasks</p>
        <p className="text-xs mt-1">Create a task to get started</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {tasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            selected={task.id === selectedId}
            onClick={() => onSelect(task.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
