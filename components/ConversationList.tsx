import Link from "next/link";
import type { Database } from "@/lib/types/database";
import { TOPICS } from "@/lib/vapi/assistant-config";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "In progress";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.max(0, Math.round(ms / 60000));
  return minutes < 1 ? "< 1 min" : `${minutes} min`;
}

export function ConversationList({ conversations }: { conversations: Conversation[] }) {
  if (conversations.length === 0) {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        No conversations yet. Start one from the Talk page.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/history/${c.id}`}
            className="flex flex-col gap-1 py-4 hover:bg-black/[.02] dark:hover:bg-white/[.03] px-2 -mx-2 rounded-md"
          >
            <div className="flex justify-between items-center gap-2">
              <span className="text-sm font-medium">
                {new Date(c.started_at).toLocaleString()}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs rounded-full px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  {TOPICS[c.topic]?.label ?? c.topic}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {formatDuration(c.started_at, c.ended_at)}
                </span>
              </div>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300 line-clamp-2">
              {c.summary ?? (c.status === "in_progress" ? "In progress..." : "No summary available")}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
