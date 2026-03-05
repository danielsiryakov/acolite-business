"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Task, TaskStatus, TaskPriority } from "@/lib/task-queue/types";

interface Filters {
  status?: TaskStatus;
  priority?: TaskPriority;
  parentTaskId?: string | null;
  includeCompleted?: boolean;
}

export function useTasks(filters: Filters = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const refetch = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      const f = filtersRef.current;
      if (f.status) params.set("status", f.status);
      if (f.priority) params.set("priority", f.priority);
      if (f.parentTaskId !== undefined) params.set("parent_task_id", f.parentTaskId === null ? "root" : f.parentTaskId);
      if (f.includeCompleted) params.set("include_completed", "true");
      const res = await fetch(`/api/tasks?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data.tasks);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const hasActive = tasks.some((t) => t.status === "in_progress" || t.status === "queued");
    const interval = setInterval(refetch, hasActive ? 5000 : 30000);
    const onVisibility = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, [refetch, tasks.length > 0 && tasks.some((t) => t.status === "in_progress" || t.status === "queued")]);

  return { tasks, isLoading, error, refetch };
}
