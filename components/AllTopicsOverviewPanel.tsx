import { TOPICS, TOPIC_ORDER } from "@/lib/vapi/assistant-config";
import { StructuredDataWidget } from "@/components/StructuredDataWidget";
import type { ConversationTopic } from "@/lib/types/database";
import type { TopicHistoryEntry } from "@/app/talk/page";

export function AllTopicsOverviewPanel({
  topicHistory,
}: {
  topicHistory: Partial<Record<ConversationTopic, TopicHistoryEntry>>;
}) {
  const topicsWithData = TOPIC_ORDER.filter((topic) => topicHistory[topic]?.aggregate);

  if (topicsWithData.length === 0) {
    return (
      <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Pick a topic to get started, or select one above to see what&apos;s been recorded so far.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      {topicsWithData.map((topic) => (
        <div key={topic} className="rounded-lg border border-black/10 dark:border-white/10 p-4">
          <h2 className="text-sm font-medium mb-3">{TOPICS[topic].label}</h2>
          <StructuredDataWidget topic={topic} data={topicHistory[topic]!.aggregate!} />
        </div>
      ))}
    </div>
  );
}
