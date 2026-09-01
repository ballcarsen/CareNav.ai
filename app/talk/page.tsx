import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TalkScreen } from "@/components/TalkScreen";
import { mergeStructuredDataBlobs } from "@/lib/vapi/structured-data-merge";
import type { TopicOverrides } from "@/lib/vapi/assistant-config";
import type { ConversationTopic } from "@/lib/types/database";

export interface RecentConversation {
  id: string;
  summary: string | null;
  started_at: string;
}

export interface TopicHistoryEntry {
  aggregate: Record<string, unknown> | null;
  recent: RecentConversation[];
}

export default async function TalkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: completedConversations } = await supabase
    .from("conversations")
    .select("id, topics, structured_data, summary, started_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("started_at", { ascending: false });

  type CompletedConversation = NonNullable<typeof completedConversations>[number];

  // "general" has no extraction schema/widget of its own, and is present on
  // nearly every conversation (it's the router's default starting topic) --
  // bucketing it here would pull in every other topic's fields too, since all
  // squad members now share one merged post-call schema. Excluded entirely
  // rather than filtered at render time, so there's nothing to aggregate.
  const byTopic = new Map<ConversationTopic, CompletedConversation[]>();
  for (const c of completedConversations ?? []) {
    for (const topic of c.topics) {
      if (topic === "general") continue;
      const list = byTopic.get(topic) ?? [];
      list.push(c);
      byTopic.set(topic, list);
    }
  }

  const topicHistory: Partial<Record<ConversationTopic, TopicHistoryEntry>> = {};
  for (const [topic, conversations] of byTopic) {
    const blobs = conversations
      .map((c) => c.structured_data)
      .filter((d): d is Record<string, unknown> => d !== null);
    topicHistory[topic] = {
      aggregate: blobs.length > 0 ? mergeStructuredDataBlobs(topic, blobs) : null,
      recent: conversations.slice(0, 5).map((c) => ({
        id: c.id,
        summary: c.summary,
        started_at: c.started_at,
      })),
    };
  }

  const { data: overrideRows } = await supabase.from("topic_overrides").select("*");

  const topicOverrides: TopicOverrides = {};
  for (const row of overrideRows ?? []) {
    topicOverrides[row.topic] = {
      systemPrompt: row.system_prompt,
      firstMessage: row.first_message,
      description: row.description,
    };
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Talk with your care navigator</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Get help with appointments, insurance, and resources, or build out your medical history,
          symptoms, medications, and family history over voice.
        </p>
      </div>
      <TalkScreen userId={user.id} topicHistory={topicHistory} topicOverrides={topicOverrides} />
    </main>
  );
}
