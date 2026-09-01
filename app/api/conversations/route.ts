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

  const { id, topic } = (await request.json().catch(() => ({}))) as {
    id?: string;
    topic?: ConversationTopic;
  };

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      ...(id ? { id } : {}),
      user_id: user.id,
      status: "in_progress",
      ...(topic ? { topic } : {}),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
