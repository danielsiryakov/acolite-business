"use client";
import { useState, useEffect, useCallback } from "react";
import type { Task, TaskLog } from "@/lib/task-queue/types";

export function useTaskDetail(taskId: string | null) {
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!taskId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tasks/${taskId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch task");
      const data = await res.json();
      setTask(data.task);
      setSubtasks(data.subtasks || []);
      setLogs(data.logs || []);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) { setTask(null); setSubtasks([]); setLogs([]); return; }
    refetch();
    const interval = task?.status === "in_progress" ? setInterval(refetch, 5000) : null;
    return () => { if (interval) clearInterval(interval); };
  }, [taskId, refetch, task?.status]);

  return { task, subtasks, logs, isLoading, error, refetch };
}
