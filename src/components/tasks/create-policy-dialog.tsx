"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PolicyType } from "@/lib/task-queue/types";

export function CreatePolicyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [policyType, setPolicyType] = useState<PolicyType>("max_concurrent");
  const [maxConcurrent, setMaxConcurrent] = useState("3");
  const [maxTasks, setMaxTasks] = useState("10");
  const [windowSeconds, setWindowSeconds] = useState("3600");
  const [startHour, setStartHour] = useState("9");
  const [endHour, setEndHour] = useState("17");
  const [maxCents, setMaxCents] = useState("1000");
  const [per, setPer] = useState<"task" | "day" | "month">("day");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setPolicyType("max_concurrent");
    setMaxConcurrent("3");
    setMaxTasks("10");
    setWindowSeconds("3600");
  };

  const buildConfig = (): Record<string, unknown> => {
    switch (policyType) {
      case "max_concurrent": return { max: parseInt(maxConcurrent) };
      case "rate_limit": return { max_tasks: parseInt(maxTasks), window_seconds: parseInt(windowSeconds) };
      case "time_window": return { allowed_hours: { start: parseInt(startHour), end: parseInt(endHour) }, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, days: [1, 2, 3, 4, 5] };
      case "spend_cap": return { max_cents: parseInt(maxCents), per };
      default: return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          policy_type: policyType,
          config: buildConfig(),
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create policy");

      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      console.error("Create policy error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Policy</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="policyName">Name</Label>
            <Input id="policyName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Policy name" required />
          </div>

          <div>
            <Label htmlFor="policyDesc">Description</Label>
            <Textarea id="policyDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" rows={2} />
          </div>

          <div>
            <Label>Type</Label>
            <Select value={policyType} onValueChange={(v) => setPolicyType(v as PolicyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="max_concurrent">Max Concurrent Tasks</SelectItem>
                <SelectItem value="rate_limit">Rate Limit</SelectItem>
                <SelectItem value="time_window">Time Window</SelectItem>
                <SelectItem value="spend_cap">Spend Cap</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {policyType === "max_concurrent" && (
            <div>
              <Label>Max concurrent tasks</Label>
              <Input type="number" min="1" value={maxConcurrent} onChange={(e) => setMaxConcurrent(e.target.value)} />
            </div>
          )}

          {policyType === "rate_limit" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max tasks</Label>
                <Input type="number" min="1" value={maxTasks} onChange={(e) => setMaxTasks(e.target.value)} />
              </div>
              <div>
                <Label>Window (seconds)</Label>
                <Input type="number" min="1" value={windowSeconds} onChange={(e) => setWindowSeconds(e.target.value)} />
              </div>
            </div>
          )}

          {policyType === "time_window" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start hour (0-23)</Label>
                <Input type="number" min="0" max="23" value={startHour} onChange={(e) => setStartHour(e.target.value)} />
              </div>
              <div>
                <Label>End hour (0-23)</Label>
                <Input type="number" min="0" max="23" value={endHour} onChange={(e) => setEndHour(e.target.value)} />
              </div>
            </div>
          )}

          {policyType === "spend_cap" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max (cents)</Label>
                <Input type="number" min="1" value={maxCents} onChange={(e) => setMaxCents(e.target.value)} />
              </div>
              <div>
                <Label>Per</Label>
                <Select value={per} onValueChange={(v) => setPer(v as "task" | "day" | "month")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
