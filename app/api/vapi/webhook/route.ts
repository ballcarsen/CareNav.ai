import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { TranscriptTurn } from "@/lib/types/database";

interface VapiWebhookBody {
  message: {
    type: string;
    endedReason?: string;
    call?: {
      id?: string;
      assistantOverrides?: { metadata?: { userId?: string } };
    };
    artifact?: {
      messages?: { role: string; message: string; secondsFromStart?: number }[];
    };
    analysis?: {
      summary?: string;
    };
  };
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.VAPI_WEBHOOK_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${expected}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as VapiWebhookBody;
  const { message } = body;

  if (message.type !== "end-of-call-report") {
    return NextResponse.json({ received: true });
  }

  const callId = message.call?.id;
  if (!callId) {
    return NextResponse.json({ received: true });
  }

  const transcript: TranscriptTurn[] =
    message.artifact?.messages?.map((m) => ({
      role: m.role,
      message: m.message,
      secondsFromStart: m.secondsFromStart,
    })) ?? [];

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("vapi_call_id", callId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("conversations")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        transcript,
        summary: message.analysis?.summary ?? null,
        ended_reason: message.endedReason ?? null,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to finalize conversation", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const userId = message.call?.assistantOverrides?.metadata?.userId;
    if (!userId) {
      console.error("end-of-call-report with no matching row and no recoverable userId", callId);
      return NextResponse.json({ received: true });
    }

    const { error } = await supabase.from("conversations").insert({
      user_id: userId,
      vapi_call_id: callId,
      status: "completed",
      ended_at: new Date().toISOString(),
      transcript,
      summary: message.analysis?.summary ?? null,
      ended_reason: message.endedReason ?? null,
    });

    if (error) {
      console.error("Failed to insert conversation from webhook", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
