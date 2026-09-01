"use client";

import { useState } from "react";
import { updateTopicOverride } from "@/app/admin/actions";
import type { ConversationTopic } from "@/lib/types/database";

export function TopicOverrideForm({
  topic,
  label,
  defaults,
  current,
}: {
  topic: ConversationTopic;
  label: string;
  defaults: { systemPrompt: string; firstMessage: string; description: string };
  current: { systemPrompt: string | null; firstMessage: string | null; description: string | null };
}) {
  const [systemPrompt, setSystemPrompt] = useState(current.systemPrompt ?? "");
  const [firstMessage, setFirstMessage] = useState(current.firstMessage ?? "");
  const [description, setDescription] = useState(current.description ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await updateTopicOverride({ topic, systemPrompt, firstMessage, description });
    setSaving(false);
    setMessage(result?.error ? result.error : "Saved.");
  }

  function handleReset() {
    setSystemPrompt("");
    setFirstMessage("");
    setDescription("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-black/10 dark:border-white/10 p-4 flex flex-col gap-3"
    >
      <h2 className="text-sm font-medium">{label}</h2>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500 dark:text-stone-400">First message</label>
        <input
          value={firstMessage}
          onChange={(e) => setFirstMessage(e.target.value)}
          placeholder={defaults.firstMessage}
          className="rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500 dark:text-stone-400">
          Transfer description (used to decide when to route here)
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={defaults.description}
          className="rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500 dark:text-stone-400">System prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder={defaults.systemPrompt}
          rows={6}
          className="rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm font-mono"
        />
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Clinical safety boundaries are always added automatically and can&apos;t be changed here.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-amber-700 hover:bg-amber-800 disabled:opacity-60 text-white px-4 py-2 text-sm font-medium"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="text-sm text-stone-500 dark:text-stone-400 hover:underline"
        >
          Reset to defaults
        </button>
        {message && <span className="text-xs text-stone-500 dark:text-stone-400">{message}</span>}
      </div>
    </form>
  );
}
