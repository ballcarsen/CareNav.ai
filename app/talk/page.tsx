import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TalkScreen } from "@/components/TalkScreen";
import { mergeStructuredDataBlobs } from "@/lib/vapi/structured-data-merge";
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
    .select("id, topic, structured_data, summary, started_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("started_at", { ascending: false });

  type CompletedConversation = NonNullable<typeof completedConversations>[number];

  const byTopic = new Map<ConversationTopic, CompletedConversation[]>();
  for (const c of completedConversations ?? []) {
    const list = byTopic.get(c.topic) ?? [];
    list.push(c);
    byTopic.set(c.topic, list);
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

  const allRecent: RecentConversation[] = (completedConversations ?? []).slice(0, 5).map((c) => ({
    id: c.id,
    summary: c.summary,
    started_at: c.started_at,
  }));

  return (
    <main className="flex flex-1 flex-col items-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Talk with your care navigator</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ask about appointments, referrals, insurance, or finding local resources.
        </p>
      </div>
      <TalkScreen userId={user.id} topicHistory={topicHistory} allRecent={allRecent} />
    </main>
  );
}
