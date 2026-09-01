import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ConversationTopic } from "@/lib/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      ...(id ? { id } : {}),
      user_id: user.id,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

// Called once per in-call transfer, so the row picks up every topic the
// squad actually routed the caller to. Only reachable while the row is still
// 'in_progress' -- see the conversations_update_topics_while_in_progress RLS
// policy in supabase/migrations/0003_multi_topic_conversations.sql.
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, topic } = (await request.json().catch(() => ({}))) as {
    id?: string;
    topic?: ConversationTopic;
  };

  if (!id || !topic) {
    return NextResponse.json({ error: "id and topic are required" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("conversations")
    .select("topics")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 });
  }

  if (existing.topics.includes(topic)) {
    return NextResponse.json({ topics: existing.topics });
  }

  const topics = [...existing.topics, topic];

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ topics })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ topics });
}
