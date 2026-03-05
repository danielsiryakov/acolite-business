import fs from "fs";
import path from "path";
import readline from "readline";

const GROUP_FOLDER = process.env.NANOCLAW_GROUP_FOLDER || "";
const IPC_TASKS_DIR = "/workspace/ipc/tasks";
const IPC_MESSAGES_DIR = "/workspace/ipc/messages";
const TASKS_SNAPSHOT = "/workspace/ipc/current_tasks.json";

function log(msg: string) {
  process.stderr.write(`[ipc-mcp] ${msg}\n`);
}

function writeIpcFile(dir: string, data: Record<string, unknown>): string {
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  fs.writeFileSync(
    path.join(dir, name),
    JSON.stringify({ ...data, timestamp: new Date().toISOString(), group_folder: GROUP_FOLDER }),
  );
  return name;
}

function readSnapshot(): Record<string, unknown>[] {
  try {
    if (fs.existsSync(TASKS_SNAPSHOT)) {
      return JSON.parse(fs.readFileSync(TASKS_SNAPSHOT, "utf-8"));
    }
  } catch { /* ignore */ }
  return [];
}

// Tool definitions
const TOOLS = [
  {
    name: "create_task",
    description: "Create a new task. If a prompt is provided and no schedule is set, it will be queued for immediate execution.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title for the task" },
        description: { type: "string", description: "Detailed description" },
        prompt: { type: "string", description: "The instruction to execute" },
        priority: { type: "string", enum: ["low", "normal", "high", "urgent"], description: "Priority level" },
        schedule_type: { type: "string", enum: ["once", "interval", "cron"], description: "Schedule type" },
        schedule_value: { type: "string", description: "ISO datetime for once, ms for interval, cron expression for cron" },
        parent_task_id: { type: "string", description: "Parent task ID if this is a subtask" },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description: "List tasks. By default shows active tasks (not completed/cancelled/failed).",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["todo", "queued", "in_progress", "completed", "failed", "cancelled", "all"] },
        priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
        parent_task_id: { type: "string", description: "Filter to subtasks of a parent" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "get_task",
    description: "Get full details of a task by ID.",
    inputSchema: {
      type: "object",
      properties: { task_id: { type: "string", description: "The task ID" } },
      required: ["task_id"],
    },
  },
  {
    name: "update_task",
    description: "Update a task's status, description, or priority.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "The task ID to update" },
        status: { type: "string", enum: ["queued", "cancelled"] },
        description: { type: "string" },
        priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
        notes: { type: "string", description: "A note to append" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as completed with an optional result summary.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "The task ID" },
        result: { type: "string", description: "Summary of what was accomplished" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "create_subtask",
    description: "Create a child task under a parent. The parent auto-completes when all subtasks finish.",
    inputSchema: {
      type: "object",
      properties: {
        parent_task_id: { type: "string", description: "Parent task ID" },
        title: { type: "string", description: "Subtask title" },
        description: { type: "string" },
        prompt: { type: "string", description: "Instruction to execute" },
        priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
      },
      required: ["parent_task_id", "title"],
    },
  },
  {
    name: "send_message",
    description: "Send a message to the user immediately.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string", description: "Message text" } },
      required: ["text"],
    },
  },
];

function handleToolCall(name: string, args: Record<string, unknown>): { content: { type: string; text: string }[] } {
  switch (name) {
    case "create_task": {
      if (!args.title) return { content: [{ type: "text", text: "Error: title is required" }] };
      const file = writeIpcFile(IPC_TASKS_DIR, {
        type: "create_task",
        title: args.title,
        description: args.description || null,
        prompt: args.prompt || null,
        priority: args.priority || "normal",
        schedule_type: args.schedule_type || null,
        schedule_value: args.schedule_value || null,
        parent_task_id: args.parent_task_id || null,
        created_by: "agent",
      });
      return { content: [{ type: "text", text: `Task "${args.title}" created (${file}). Will be processed within 5 seconds.` }] };
    }

    case "list_tasks": {
      let tasks = readSnapshot();
      const status = args.status as string | undefined;
      if (status && status !== "all") {
        tasks = tasks.filter((t) => t.status === status);
      } else if (!status) {
        tasks = tasks.filter((t) => !["completed", "cancelled", "failed"].includes(t.status as string));
      }
      if (args.priority) tasks = tasks.filter((t) => t.priority === args.priority);
      if (args.parent_task_id) tasks = tasks.filter((t) => t.parent_task_id === args.parent_task_id);
      const limit = (args.limit as number) || 20;
      tasks = tasks.slice(0, limit);
      return { content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }] };
    }

    case "get_task": {
      if (!args.task_id) return { content: [{ type: "text", text: "Error: task_id is required" }] };
      const all = readSnapshot();
      const found = all.find((t) => t.id === args.task_id) ||
        all.flatMap((t) => (t.subtasks as Record<string, unknown>[]) || []).find((s) => s.id === args.task_id);
      if (!found) return { content: [{ type: "text", text: `Task ${args.task_id} not found` }] };
      return { content: [{ type: "text", text: JSON.stringify(found, null, 2) }] };
    }

    case "update_task": {
      if (!args.task_id) return { content: [{ type: "text", text: "Error: task_id is required" }] };
      const file = writeIpcFile(IPC_TASKS_DIR, {
        type: "update_task",
        task_id: args.task_id,
        status: args.status || null,
        description: args.description || null,
        priority: args.priority || null,
        notes: args.notes || null,
      });
      return { content: [{ type: "text", text: `Task ${args.task_id} update queued (${file}).` }] };
    }

    case "complete_task": {
      if (!args.task_id) return { content: [{ type: "text", text: "Error: task_id is required" }] };
      const file = writeIpcFile(IPC_TASKS_DIR, {
        type: "complete_task",
        task_id: args.task_id,
        result: args.result || null,
      });
      return { content: [{ type: "text", text: `Task ${args.task_id} marked complete (${file}).` }] };
    }

    case "create_subtask": {
      if (!args.parent_task_id || !args.title) {
        return { content: [{ type: "text", text: "Error: parent_task_id and title are required" }] };
      }
      const file = writeIpcFile(IPC_TASKS_DIR, {
        type: "create_task",
        title: args.title,
        description: args.description || null,
        prompt: args.prompt || null,
        priority: args.priority || "normal",
        parent_task_id: args.parent_task_id,
        created_by: "agent",
      });
      return { content: [{ type: "text", text: `Subtask "${args.title}" created under ${args.parent_task_id} (${file}).` }] };
    }

    case "send_message": {
      if (!args.text) return { content: [{ type: "text", text: "Error: text is required" }] };
      writeIpcFile(IPC_MESSAGES_DIR, { type: "message", text: args.text });
      return { content: [{ type: "text", text: "Message sent." }] };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }
}

function respond(id: unknown, result: unknown) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    const { id, method, params } = msg;

    if (method === "initialize") {
      respond(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "nanoclaw", version: "1.0.0" },
      });
    } else if (method === "notifications/initialized") {
      // No response for notifications
    } else if (method === "tools/list") {
      respond(id, { tools: TOOLS });
    } else if (method === "tools/call") {
      const toolName = params?.name as string;
      const toolArgs = (params?.arguments || {}) as Record<string, unknown>;
      log(`Tool call: ${toolName}`);
      const result = handleToolCall(toolName, toolArgs);
      respond(id, result);
    } else if (method === "ping") {
      respond(id, {});
    } else {
      log(`Unknown method: ${method}`);
      if (id !== undefined) {
        process.stdout.write(
          JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } }) + "\n",
        );
      }
    }
  } catch (err) {
    log(`Parse error: ${err}`);
  }
});

log("MCP server started");
