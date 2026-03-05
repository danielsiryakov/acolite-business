"use client";
import { useState, useEffect, useCallback } from "react";
import type { TaskPolicy } from "@/lib/task-queue/types";

export function usePolicies() {
  const [policies, setPolicies] = useState<TaskPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/policies", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch policies");
      const data = await res.json();
      setPolicies(data.policies);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { policies, isLoading, error, refetch };
}
