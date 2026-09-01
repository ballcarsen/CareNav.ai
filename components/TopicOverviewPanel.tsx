import Link from "next/link";
import { StructuredDataWidget } from "@/components/StructuredDataWidget";
import type { ConversationTopic } from "@/lib/types/database";
import type { TopicHistoryEntry } from "@/app/talk/page";

export function TopicOverviewPanel({
  topic,
  history,
}: {
  topic: ConversationTopic;
  history?: TopicHistoryEntry;
}) {
  const aggregate = history?.aggregate ?? null;
  const recent = history?.recent ?? [];

  return (
    <div className="flex flex-col gap-4 w-full">
      {topic !== "general" && (
        <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
          <h2 className="text-sm font-medium mb-3">What we know so far</h2>
          {aggregate ? (
            <StructuredDataWidget topic={topic} data={aggregate} />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No previous conversations on this topic yet.
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
        <h2 className="text-sm font-medium mb-3">Recent conversations</h2>
        {recent.length > 0 ? (
          <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {recent.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/history/${c.id}`}
                  className="block py-2 hover:bg-black/[.02] dark:hover:bg-white/[.03] -mx-2 px-2 rounded-md"
                >
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No previous conversations on this topic yet.
          </p>
        )}
      </div>
    </div>
  );
}
