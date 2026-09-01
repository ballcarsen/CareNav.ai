import type { Database } from "@/lib/types/database";
import { TOPICS } from "@/lib/vapi/assistant-config";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

export function ConversationDetail({ conversation }: { conversation: Conversation }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-medium rounded-full px-2 py-0.5 ${
              conversation.status === "completed"
                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                : conversation.status === "failed"
                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300"
            }`}
          >
            {conversation.status}
          </span>
          <span className="text-xs rounded-full px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {TOPICS[conversation.topic]?.label ?? conversation.topic}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(conversation.started_at).toLocaleString()}
          </span>
        </div>
        {conversation.summary && <p className="text-sm">{conversation.summary}</p>}
      </div>

      {conversation.structured_data && (
        <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
          <h2 className="text-sm font-medium mb-2">Extracted details</h2>
          <pre className="text-xs whitespace-pre-wrap break-words text-gray-600 dark:text-gray-300">
            {JSON.stringify(conversation.structured_data, null, 2)}
          </pre>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {conversation.transcript && conversation.transcript.length > 0 ? (
          conversation.transcript.map((turn, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                turn.role === "assistant" || turn.role === "bot"
                  ? "self-start bg-gray-100 dark:bg-gray-800"
                  : "self-end bg-blue-100 dark:bg-blue-900"
              }`}
            >
              <span className="block text-xs font-medium opacity-60 mb-0.5">
                {turn.role === "assistant" || turn.role === "bot" ? "Care Navigator" : "You"}
              </span>
              {turn.message}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No transcript available for this conversation.
          </p>
        )}
      </div>
    </div>
  );
}
