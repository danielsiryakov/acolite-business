import { NextRequest, NextResponse } from "next/server";
import { fireEvent, type TriggerEventType } from "@/lib/task-queue";

const STRIPE_EVENT_MAP: Record<string, TriggerEventType> = {
  "payment_intent.payment_failed": "payment_failed",
  "charge.failed": "payment_failed",
  "payment_intent.succeeded": "payment_succeeded",
  "charge.succeeded": "payment_succeeded",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const stripeEventType = body.type as string;
    const eventType = STRIPE_EVENT_MAP[stripeEventType];
    if (!eventType) return NextResponse.json({ ok: true }); // Ignore unhandled event types

    const userId = body.data?.object?.metadata?.user_id;
    if (!userId) return NextResponse.json({ ok: true }); // Can't route without user_id

    await fireEvent({
      type: eventType,
      payload: {
        stripe_event_type: stripeEventType,
        amount: body.data?.object?.amount,
        currency: body.data?.object?.currency,
        customer_email: body.data?.object?.customer_email,
      },
      timestamp: new Date().toISOString(),
      user_id: userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/webhooks/stripe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
