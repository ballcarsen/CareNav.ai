"use client";

import { TOPICS, TOPIC_ORDER } from "@/lib/vapi/assistant-config";
import type { ConversationTopic } from "@/lib/types/database";

export function TopicPicker({
  value,
  onChange,
  disabled,
}: {
  value: ConversationTopic | null;
  onChange: (topic: ConversationTopic) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg">
      {TOPIC_ORDER.map((topic) => {
        const t = TOPICS[topic];
        const selected = topic === value;
        return (
          <button
            key={topic}
            type="button"
            disabled={disabled}
            onClick={() => onChange(topic)}
            className={`text-left rounded-md border px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              selected
                ? "border-amber-600 bg-amber-50 dark:bg-amber-950"
                : "border-black/10 dark:border-white/20"
            }`}
          >
            <span className="block font-medium">{t.label}</span>
            <span className="block text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {t.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
