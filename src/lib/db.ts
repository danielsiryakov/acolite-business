import { createClient } from "@libsql/client";
import path from "path";

const dbPath = `file:${path.join(process.cwd(), "prisma", "dev.db")}`;

const client = createClient({
  url: dbPath,
});

let initialized = false;

export async function initDb() {
  if (initialized) return;

  // Messages table for chat history
  await client.execute(`
    CREATE TABLE IF NOT EXISTS nanoclaw_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_nanoclaw_messages_user_id
    ON nanoclaw_messages(user_id)
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_nanoclaw_messages_created_at
    ON nanoclaw_messages(user_id, created_at)
  `);

  // Sessions table for agent state
  await client.execute(`
    CREATE TABLE IF NOT EXISTS nanoclaw_sessions (
      user_id TEXT PRIMARY KEY,
      session_id TEXT,
      container_id TEXT,
      last_activity TEXT NOT NULL DEFAULT (datetime('now')),
      settings TEXT DEFAULT '{}'
    )
  `);

  initialized = true;
}

export interface Message {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Session {
  user_id: string;
  session_id: string | null;
  container_id: string | null;
  last_activity: string;
  settings: string;
}

export async function addMessage(
  userId: string,
  role: "user" | "assistant",
  content: string
): Promise<Message> {
  await initDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO nanoclaw_messages (id, user_id, role, content, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, userId, role, content, created_at],
  });

  return { id, user_id: userId, role, content, created_at };
}

export async function getMessages(
  userId: string,
  limit: number = 50
): Promise<Message[]> {
  await initDb();
  const result = await client.execute({
    sql: `SELECT * FROM nanoclaw_messages
          WHERE user_id = ?
          ORDER BY created_at ASC
          LIMIT ?`,
    args: [userId, limit],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    role: row.role as "user" | "assistant",
    content: row.content as string,
    created_at: row.created_at as string,
  }));
}

export async function getSession(userId: string): Promise<Session | null> {
  await initDb();
  const result = await client.execute({
    sql: `SELECT * FROM nanoclaw_sessions WHERE user_id = ?`,
    args: [userId],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    user_id: row.user_id as string,
    session_id: row.session_id as string | null,
    container_id: row.container_id as string | null,
    last_activity: row.last_activity as string,
    settings: row.settings as string,
  };
}

export async function upsertSession(
  userId: string,
  sessionId?: string,
  containerId?: string
): Promise<void> {
  await initDb();
  await client.execute({
    sql: `INSERT INTO nanoclaw_sessions (user_id, session_id, container_id, last_activity)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(user_id) DO UPDATE SET
            session_id = COALESCE(?, session_id),
            container_id = COALESCE(?, container_id),
            last_activity = datetime('now')`,
    args: [userId, sessionId ?? null, containerId ?? null, sessionId ?? null, containerId ?? null],
  });
}

export async function clearMessages(userId: string): Promise<void> {
  await initDb();
  await client.execute({
    sql: `DELETE FROM nanoclaw_messages WHERE user_id = ?`,
    args: [userId],
  });
}
