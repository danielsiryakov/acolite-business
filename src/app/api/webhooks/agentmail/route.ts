import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/db";
import { fireEvent } from "@/lib/task-queue";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inboxId = body.inbox_id;
    if (!inboxId) return NextResponse.json({ error: "inbox_id required" }, { status: 400 });

    const result = await client.execute({
      sql: `SELECT user_id FROM nanoclaw_mailboxes WHERE inbox_id = ? LIMIT 1`,
      args: [inboxId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Unknown inbox" }, { status: 404 });
    }

    const userId = result.rows[0].user_id as string;

    await fireEvent({
      type: "email_received",
      payload: { ...body, inbox_id: inboxId, from_email: body.from?.email, subject: body.subject },
      timestamp: new Date().toISOString(),
      user_id: userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/webhooks/agentmail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
