"use client";

import { useState } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { TaskToolbar } from "./task-toolbar";
import { TaskList } from "./task-list";
import { TaskDetail } from "./task-detail";
import { CreateTaskDialog } from "./create-task-dialog";
import type { TaskStatus, TaskPriority } from "@/lib/task-queue/types";

export function TaskPanel() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { tasks, isLoading, refetch } = useTasks({
    status: statusFilter === "all" ? undefined : statusFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
    parentTaskId: null, // root tasks only
    includeCompleted: statusFilter === "completed" || statusFilter === "cancelled" || statusFilter === "failed",
  });

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-lg border shadow-sm">
      <TaskToolbar
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onCreateTask={() => setShowCreate(true)}
      />

      <div className="flex flex-1 min-h-0">
        {/* Task List */}
        <div className="w-full lg:w-[45%] border-r overflow-hidden">
          {isLoading && tasks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Loading tasks...
            </div>
          ) : (
            <TaskList
              tasks={tasks}
              selectedId={selectedTaskId}
              onSelect={setSelectedTaskId}
            />
          )}
        </div>

        {/* Task Detail */}
        <div className="hidden lg:block flex-1 overflow-hidden">
          {selectedTaskId ? (
            <TaskDetail
              taskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onRefreshList={refetch}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Select a task to view details
            </div>
          )}
        </div>
      </div>

      <CreateTaskDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={refetch}
      />
    </div>
  );
}
