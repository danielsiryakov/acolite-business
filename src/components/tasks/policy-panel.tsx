"use client";

import { useState } from "react";
import { usePolicies } from "@/hooks/use-policies";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreatePolicyDialog } from "./create-policy-dialog";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import type { TaskPolicy } from "@/lib/task-queue/types";

function PolicyCard({ policy, onDelete }: { policy: TaskPolicy; onDelete: () => void }) {
  const config = JSON.parse(policy.config);
  const configSummary = (() => {
    switch (policy.policy_type) {
      case "max_concurrent": return `Max ${config.max} concurrent`;
      case "rate_limit": return `${config.max_tasks} per ${config.window_seconds}s`;
      case "time_window": return `${config.allowed_hours?.start}:00–${config.allowed_hours?.end}:00`;
      case "spend_cap": return `$${(config.max_cents / 100).toFixed(2)}/${config.per}`;
      default: return "Custom";
    }
  })();

  return (
    <div className="flex items-start justify-between p-3 rounded-lg border">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{policy.name}</span>
          <Badge variant="outline" className="text-xs">{policy.policy_type}</Badge>
        </div>
        <p className="text-xs text-gray-500 mt-1">{configSummary}</p>
        {policy.description && (
          <p className="text-xs text-gray-400 mt-0.5">{policy.description}</p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600 h-7 w-7 p-0">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function PolicyPanel() {
  const { policies, isLoading, refetch } = usePolicies();
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = async (id: string) => {
    await fetch(`/api/tasks/policies/${id}`, { method: "DELETE", credentials: "include" });
    refetch();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-lg border shadow-sm">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-sm">Task Policies</span>
        </div>
        <Button size="sm" className="h-8" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Policy
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
        ) : policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ShieldCheck className="h-10 w-10 mb-3" />
            <p className="text-sm font-medium">No policies</p>
            <p className="text-xs mt-1">Policies control task execution limits</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {policies.map((p) => (
              <PolicyCard key={p.id} policy={p} onDelete={() => handleDelete(p.id)} />
            ))}
          </div>
        )}
      </ScrollArea>

      <CreatePolicyDialog open={showCreate} onOpenChange={setShowCreate} onCreated={refetch} />
    </div>
  );
}
