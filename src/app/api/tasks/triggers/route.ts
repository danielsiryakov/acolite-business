import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { listTriggers, createTrigger } from "@/lib/task-queue";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const triggers = await listTriggers(session.user.id);
    return NextResponse.json({ triggers });
  } catch (error) {
    console.error("GET /api/tasks/triggers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.name || !body.event_type || !body.task_title || !body.task_prompt) {
      return NextResponse.json({ error: "name, event_type, task_title, and task_prompt are required" }, { status: 400 });
    }

    const trigger = await createTrigger({
      user_id: session.user.id,
      name: body.name,
      event_type: body.event_type,
      event_filter: body.event_filter || {},
      task_title: body.task_title,
      task_prompt: body.task_prompt,
      task_priority: body.task_priority,
      description: body.description,
    });

    return NextResponse.json({ trigger }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/triggers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
