"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVapiClient } from "@/lib/vapi/client";
import { buildAssistantForTopic, buildAssistantOverrides, TOOL_LIVE_META } from "@/lib/vapi/assistant-config";
import { LiveTranscript, type LiveTranscriptTurn } from "@/components/LiveTranscript";
import { StructuredDataWidget } from "@/components/StructuredDataWidget";
import type { ConversationTopic } from "@/lib/types/database";

type CallState = "idle" | "connecting" | "connected" | "error";

interface RawToolCall {
  id: string;
  name: string;
  args: string;
}

// Vapi's exact client-message envelope for tool calls isn't worth hard-coding
// against -- this walks the whole message looking for `{ function: { name,
// arguments } }` wherever it appears, so it keeps working even if the
// wrapping shape (field name, nesting) differs from what's documented.
function findToolCalls(node: unknown, out: RawToolCall[], seen: Set<string>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) findToolCalls(item, out, seen);
    return;
  }
  const obj = node as Record<string, unknown>;
  const fn = obj.function as { name?: unknown; arguments?: unknown } | undefined;
  if (fn && typeof fn.name === "string" && typeof fn.arguments === "string") {
    const id = typeof obj.id === "string" ? obj.id : `${fn.name}:${fn.arguments}`;
    if (!seen.has(id)) {
      seen.add(id);
      out.push({ id, name: fn.name, args: fn.arguments });
    }
  }
  for (const key of Object.keys(obj)) {
    if (key === "function") continue;
    findToolCalls(obj[key], out, seen);
  }
}

function applyToolCallEntry(
  prev: Record<string, unknown[]>,
  dataKey: string,
  mergeKey: string | undefined,
  scalarField: string | undefined,
  parsed: Record<string, unknown>,
): Record<string, unknown[]> {
  const existing = prev[dataKey] ?? [];

  if (scalarField) {
    const value = parsed[scalarField];
    if (typeof value !== "string" || !value.trim()) return prev;
    if (existing.includes(value)) return prev;
    return { ...prev, [dataKey]: [...existing, value] };
  }

  if (mergeKey) {
    const key = parsed[mergeKey];
    if (typeof key === "string" && key.trim()) {
      const index = existing.findIndex(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as Record<string, unknown>)[mergeKey] === "string" &&
          ((item as Record<string, unknown>)[mergeKey] as string).trim().toLowerCase() ===
            key.trim().toLowerCase(),
      );
      if (index !== -1) {
        const merged = [...existing];
        merged[index] = { ...(existing[index] as Record<string, unknown>), ...parsed };
        return { ...prev, [dataKey]: merged };
      }
    }
  }

  return { ...prev, [dataKey]: [...existing, parsed] };
}

export function StartStopCallButton({
  userId,
  topic,
  onCallActiveChange,
}: {
  userId: string;
  topic: ConversationTopic;
  onCallActiveChange?: (active: boolean) => void;
}) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [turns, setTurns] = useState<LiveTranscriptTurn[]>([]);
  const [liveStructuredData, setLiveStructuredData] = useState<Record<string, unknown[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const seenToolCallIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const vapi = getVapiClient();

    const handleCallStart = () => {
      setCallState("connected");
    };

    const handleMessage = (message: unknown) => {
      const m = message as {
        type?: string;
        transcriptType?: string;
        role?: string;
        transcript?: string;
      };

      if (m.type === "transcript" && m.transcriptType === "final" && m.role && m.transcript) {
        setTurns((prev) => [...prev, { role: m.role!, text: m.transcript! }]);
      }

      const toolCalls: RawToolCall[] = [];
      findToolCalls(message, toolCalls, seenToolCallIdsRef.current);
      for (const call of toolCalls) {
        const meta = TOOL_LIVE_META[call.name];
        if (!meta) continue;
        try {
          const parsed = JSON.parse(call.args) as Record<string, unknown>;
          setLiveStructuredData((prev) =>
            applyToolCallEntry(prev, meta.dataKey, meta.mergeKey, meta.scalarField, parsed),
          );
        } catch (error) {
          console.error("Failed to parse tool call arguments", error);
        }
      }
    };

    const handleCallEnd = () => {
      setCallState("idle");
      conversationIdRef.current = null;
    };

    const handleError = (error: unknown) => {
      console.error("Vapi error", error);
      setErrorMessage("Something went wrong with the call. Please try again.");
      setCallState("error");
      conversationIdRef.current = null;
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("message", handleMessage);
    vapi.on("call-end", handleCallEnd);
    vapi.on("error", handleError);

    return () => {
      vapi.removeListener("call-start", handleCallStart);
      vapi.removeListener("message", handleMessage);
      vapi.removeListener("call-end", handleCallEnd);
      vapi.removeListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    onCallActiveChange?.(callState === "connecting" || callState === "connected");
  }, [callState, onCallActiveChange]);

  const startCall = useCallback(async () => {
    setErrorMessage(null);
    setTurns([]);
    setLiveStructuredData({});
    seenToolCallIdsRef.current.clear();
    setCallState("connecting");

    try {
      const conversationId = crypto.randomUUID();
      conversationIdRef.current = conversationId;

      const created = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conversationId, topic }),
      });
      if (!created.ok) throw new Error("Failed to create conversation record");

      const vapi = getVapiClient();
      await vapi.start(buildAssistantForTopic(topic), buildAssistantOverrides(userId, conversationId));
    } catch (error) {
      console.error("Failed to start call", error);
      setErrorMessage("Couldn't start the call. Please check your microphone permissions and try again.");
      setCallState("error");
    }
  }, [userId, topic]);

  const stopCall = useCallback(() => {
    const vapi = getVapiClient();
    vapi.stop();
  }, []);

  const isConnecting = callState === "connecting";
  const isConnected = callState === "connected";

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg">
      <div className="flex justify-center">
        {isConnected ? (
          <button
            onClick={stopCall}
            className="rounded-full bg-red-600 hover:bg-red-700 text-white px-8 py-4 font-medium transition-colors"
          >
            End conversation
          </button>
        ) : (
          <button
            onClick={startCall}
            disabled={isConnecting}
            className="rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-8 py-4 font-medium transition-colors"
          >
            {isConnecting ? "Connecting..." : "Start conversation"}
          </button>
        )}
      </div>

      {errorMessage && <p className="text-sm text-red-600 text-center">{errorMessage}</p>}

      <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 min-h-32">
        <LiveTranscript turns={turns} />
      </div>

      {topic !== "general" && (turns.length > 0 || callState !== "idle") && (
        <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
          <h2 className="text-sm font-medium mb-3">Details captured so far</h2>
          <StructuredDataWidget topic={topic} data={liveStructuredData} />
        </div>
      )}
    </div>
  );
}
