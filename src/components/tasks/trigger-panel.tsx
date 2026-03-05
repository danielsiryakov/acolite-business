"use client";

import { useState } from "react";
import { useTriggers } from "@/hooks/use-triggers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateTriggerDialog } from "./create-trigger-dialog";
import { Plus, Trash2, Zap } from "lucide-react";
import type { TaskTrigger } from "@/lib/task-queue/types";

function TriggerCard({ trigger, onDelete }: { trigger: TaskTrigger; onDelete: () => void }) {
  return (
    <div className="flex items-start justify-between p-3 rounded-lg border">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{trigger.name}</span>
          <Badge variant="outline" className="text-xs">{trigger.event_type.replace("_", " ")}</Badge>
          {!trigger.enabled && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
        </div>
        {trigger.description && (
          <p className="text-xs text-gray-400 mt-0.5">{trigger.description}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Creates: &quot;{trigger.task_title}&quot;
          {trigger.fire_count > 0 && ` (fired ${trigger.fire_count}x)`}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600 h-7 w-7 p-0">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function TriggerPanel() {
  const { triggers, isLoading, refetch } = useTriggers();
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = async (id: string) => {
    await fetch(`/api/tasks/triggers/${id}`, { method: "DELETE", credentials: "include" });
    refetch();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-lg border shadow-sm">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-sm">Event Triggers</span>
        </div>
        <Button size="sm" className="h-8" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Trigger
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
        ) : triggers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Zap className="h-10 w-10 mb-3" />
            <p className="text-sm font-medium">No triggers</p>
            <p className="text-xs mt-1">Triggers create tasks from events</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {triggers.map((t) => (
              <TriggerCard key={t.id} trigger={t} onDelete={() => handleDelete(t.id)} />
            ))}
          </div>
        )}
      </ScrollArea>

      <CreateTriggerDialog open={showCreate} onOpenChange={setShowCreate} onCreated={refetch} />
    </div>
  );
}
