"use client";

import { useEffect, useRef } from "react";

export interface LiveTranscriptTurn {
  role: string;
  text: string;
}

export function LiveTranscript({ turns }: { turns: LiveTranscriptTurn[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  if (turns.length === 0) {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Your conversation will appear here once it starts.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto max-h-96">
      {turns.map((turn, i) => (
        <div
          key={i}
          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
            turn.role === "assistant"
              ? "self-start bg-stone-100 dark:bg-stone-800"
              : "self-end bg-amber-100 dark:bg-amber-900"
          }`}
        >
          <span className="block text-xs font-medium opacity-60 mb-0.5">
            {turn.role === "assistant" ? "Care Navigator" : "You"}
          </span>
          {turn.text}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
