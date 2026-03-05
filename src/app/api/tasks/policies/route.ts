import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { listPolicies, createPolicy } from "@/lib/task-queue";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const policies = await listPolicies(session.user.id);
    return NextResponse.json({ policies });
  } catch (error) {
    console.error("GET /api/tasks/policies error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.name || !body.policy_type || !body.config) {
      return NextResponse.json({ error: "name, policy_type, and config are required" }, { status: 400 });
    }

    const policy = await createPolicy({
      user_id: session.user.id,
      name: body.name,
      policy_type: body.policy_type,
      config: body.config,
      description: body.description,
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/policies error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
