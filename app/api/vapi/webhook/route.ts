import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { TranscriptTurn } from "@/lib/types/database";

interface VapiWebhookBody {
  message: {
    type: string;
    endedReason?: string;
    call?: {
      id?: string;
      // Single-assistant calls carry metadata directly on assistantOverrides.
      // Squad calls carry it on squad.membersOverrides instead -- confirmed by
      // pulling a real squad call's raw data from Vapi's API, since this isn't
      // documented in the type definitions.
      assistantOverrides?: { metadata?: { userId?: string; conversationId?: string } };
      squad?: { membersOverrides?: { metadata?: { userId?: string; conversationId?: string } } };
    };
    artifact?: {
      messages?: { role: string; message: string; secondsFromStart?: number }[];
    };
    analysis?: {
      summary?: string;
      structuredData?: Record<string, unknown>;
    };
    toolCallList?: { id: string; function: { name: string; arguments: string } }[];
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

  // Live "record_*" tool calls (see lib/vapi/assistant-config.ts) are async
  // and observed client-side for the live cards on the Talk page -- this
  // reply is just a well-formed no-op ack so nothing looks broken in Vapi's
  // dashboard logs. It doesn't persist anything; that stays end-of-call-only.
  if (message.type === "tool-calls") {
    const results = (message.toolCallList ?? []).map((tc) => ({ toolCallId: tc.id, result: "ok" }));
    return NextResponse.json({ results });
  }

  if (message.type !== "end-of-call-report") {
    return NextResponse.json({ received: true });
  }

  const callId = message.call?.id;
  if (!callId) {
    return NextResponse.json({ received: true });
  }

  const transcript: TranscriptTurn[] =
    message.artifact?.messages
      ?.filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role,
        message: m.message,
        secondsFromStart: m.secondsFromStart,
      })) ?? [];

  const supabase = createServiceClient();
  const metadata = message.call?.assistantOverrides?.metadata ?? message.call?.squad?.membersOverrides?.metadata;
  const conversationId = metadata?.conversationId;

  const finalized = {
    status: "completed" as const,
    ended_at: new Date().toISOString(),
    transcript,
    summary: message.analysis?.summary ?? null,
    structured_data: message.analysis?.structuredData ?? null,
    ended_reason: message.endedReason ?? null,
    vapi_call_id: callId,
  };

  // The conversation row is created client-side with this id *before* the call
  // starts, and the id is threaded through as call metadata from the start.
  // Matching on it (rather than on vapi_call_id, which is only known after the
  // call connects) avoids a race where a very short call's webhook arrives
  // before a separate "attach the call id" request would have landed.
  if (conversationId) {
    const { data: updated, error } = await supabase
      .from("conversations")
      .update(finalized)
      .eq("id", conversationId)
      .select("id");

    if (error) {
      console.error("Failed to finalize conversation", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (updated && updated.length > 0) {
      return NextResponse.json({ received: true });
    }
  }

  const userId = metadata?.userId;
  if (!userId) {
    console.error("end-of-call-report with no matching row and no recoverable userId", callId);
    return NextResponse.json({ received: true });
  }

  const { error } = await supabase.from("conversations").insert({
    ...(conversationId ? { id: conversationId } : {}),
    user_id: userId,
    ...finalized,
  });

  if (error) {
    console.error("Failed to insert conversation from webhook", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
