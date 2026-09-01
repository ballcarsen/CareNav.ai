"use client";

import { TOPICS } from "@/lib/vapi/assistant-config";
import type { ConversationTopic } from "@/lib/types/database";

const TOPIC_ORDER: ConversationTopic[] = [
  "general",
  "medical_history",
  "symptoms",
  "medications",
  "family_history",
];

export function TopicPicker({
  value,
  onChange,
  disabled,
}: {
  value: ConversationTopic;
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
                ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                : "border-black/10 dark:border-white/20"
            }`}
          >
            <span className="block font-medium">{t.label}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
