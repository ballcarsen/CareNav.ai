"use server";

import { createClient } from "@/lib/supabase/server";
import type { ConversationTopic } from "@/lib/types/database";

export async function updateTopicOverride({
  topic,
  systemPrompt,
  firstMessage,
  description,
}: {
  topic: ConversationTopic;
  systemPrompt: string;
  firstMessage: string;
  description: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  // The RLS policy topic_overrides_update_admin is what actually enforces
  // this -- a non-admin's update is rejected at the database, this check is
  // just so the UI can show a clear message instead of a generic failure.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Not authorized." };
  }

  const { error } = await supabase
    .from("topic_overrides")
    .update({
      system_prompt: systemPrompt.trim() || null,
      first_message: firstMessage.trim() || null,
      description: description.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("topic", topic);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
