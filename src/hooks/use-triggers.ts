"use client";
import { useState, useEffect, useCallback } from "react";
import type { TaskTrigger } from "@/lib/task-queue/types";

export function useTriggers() {
  const [triggers, setTriggers] = useState<TaskTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/triggers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch triggers");
      const data = await res.json();
      setTriggers(data.triggers);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { triggers, isLoading, error, refetch };
}
