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
import type { TriggerEventType, TaskPriority } from "@/lib/task-queue/types";

export function CreateTriggerDialog({
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
  const [eventType, setEventType] = useState<TriggerEventType>("email_received");
  const [eventFilter, setEventFilter] = useState("{}");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPrompt, setTaskPrompt] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setEventType("email_received");
    setEventFilter("{}");
    setTaskTitle("");
    setTaskPrompt("");
    setTaskPriority("normal");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !taskTitle.trim() || !taskPrompt.trim()) return;

    setIsSubmitting(true);
    try {
      let filter: Record<string, unknown> = {};
      try { filter = JSON.parse(eventFilter); } catch { /* empty filter */ }

      const res = await fetch("/api/tasks/triggers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          event_type: eventType,
          event_filter: filter,
          task_title: taskTitle.trim(),
          task_prompt: taskPrompt.trim(),
          task_priority: taskPriority,
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create trigger");

      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      console.error("Create trigger error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Event Trigger</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="triggerName">Name</Label>
            <Input id="triggerName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Trigger name" required />
          </div>

          <div>
            <Label htmlFor="triggerDesc">Description</Label>
            <Textarea id="triggerDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Event Type</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as TriggerEventType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_received">Email Received</SelectItem>
                  <SelectItem value="payment_failed">Payment Failed</SelectItem>
                  <SelectItem value="payment_succeeded">Payment Succeeded</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="task_completed">Task Completed</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Task Priority</Label>
              <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="eventFilter">Event Filter (JSON)</Label>
            <Textarea
              id="eventFilter"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              placeholder='{"subject_contains": "invoice"}'
              rows={2}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label htmlFor="taskTitle">Task Title Template</Label>
            <Input
              id="taskTitle"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder='Process email from {{from}}'
              required
            />
          </div>

          <div>
            <Label htmlFor="taskPrompt">Task Prompt Template</Label>
            <Textarea
              id="taskPrompt"
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder='Handle the email: {{subject}}'
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || !taskTitle.trim() || !taskPrompt.trim() || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Trigger"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
