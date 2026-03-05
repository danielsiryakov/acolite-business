"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chat } from "@/components/chat";
import { Mailboxes } from "@/components/mailboxes";
import { TaskPanel } from "@/components/tasks/task-panel";
import { PolicyPanel } from "@/components/tasks/policy-panel";
import { TriggerPanel } from "@/components/tasks/trigger-panel";
import { useTasks } from "@/hooks/use-tasks";
import { Badge } from "@/components/ui/badge";

export function DashboardTabs() {
  const { tasks } = useTasks({
    parentTaskId: null,
  });

  const activeCount = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "queued"
  ).length;

  return (
    <Tabs defaultValue="tasks" className="w-full">
      <TabsList>
        <TabsTrigger value="tasks" className="flex items-center gap-1.5">
          Tasks
          {activeCount > 0 && (
            <Badge className="h-5 min-w-5 px-1.5 text-xs bg-primary text-white">
              {activeCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="mailboxes">Mailboxes</TabsTrigger>
        <TabsTrigger value="policies">Policies</TabsTrigger>
        <TabsTrigger value="triggers">Triggers</TabsTrigger>
      </TabsList>

      <TabsContent value="tasks" className="mt-4">
        <TaskPanel />
      </TabsContent>

      <TabsContent value="chat" className="mt-4">
        <Chat />
      </TabsContent>

      <TabsContent value="mailboxes" className="mt-4">
        <Mailboxes />
      </TabsContent>

      <TabsContent value="policies" className="mt-4">
        <PolicyPanel />
      </TabsContent>

      <TabsContent value="triggers" className="mt-4">
        <TriggerPanel />
      </TabsContent>
    </Tabs>
  );
}
