import Link from "next/link";
import { TOPICS, TOPIC_ORDER } from "@/lib/vapi/assistant-config";
import { StructuredDataWidget } from "@/components/StructuredDataWidget";
import type { ConversationTopic } from "@/lib/types/database";
import type { RecentConversation, TopicHistoryEntry } from "@/app/talk/page";

export function AllTopicsOverviewPanel({
  topicHistory,
  allRecent,
}: {
  topicHistory: Partial<Record<ConversationTopic, TopicHistoryEntry>>;
  allRecent: RecentConversation[];
}) {
  const topicsWithData = TOPIC_ORDER.filter((topic) => topicHistory[topic]?.aggregate);

  return (
    <div className="flex flex-col gap-4 w-full">
      {topicsWithData.length > 0 ? (
        topicsWithData.map((topic) => (
          <div key={topic} className="rounded-lg border border-black/10 dark:border-white/10 p-4">
            <h2 className="text-sm font-medium mb-3">{TOPICS[topic].label}</h2>
            <StructuredDataWidget topic={topic} data={topicHistory[topic]!.aggregate!} />
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Pick a topic to get started, or select one above to see what&apos;s been recorded so far.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
        <h2 className="text-sm font-medium mb-3">Recent conversations</h2>
        {allRecent.length > 0 ? (
          <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {allRecent.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/history/${c.id}`}
                  className="block py-2 hover:bg-black/[.02] dark:hover:bg-white/[.03] -mx-2 px-2 rounded-md"
                >
                  <span className="block text-xs text-stone-500 dark:text-stone-400">
                    {new Date(c.started_at).toLocaleString()}
                  </span>
                  <span className="block text-sm line-clamp-2">
                    {c.summary ?? "No summary available"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">No conversations yet.</p>
        )}
      </div>
    </div>
  );
}
