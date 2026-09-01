"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVapiClient } from "@/lib/vapi/client";
import {
  buildAssistantForTopic,
  buildAssistantOverrides,
  TOPICS,
  TOOL_LIVE_META,
} from "@/lib/vapi/assistant-config";
import { mergeStructuredDataArrays } from "@/lib/vapi/structured-data-merge";
import { TopicPicker } from "@/components/TopicPicker";
import { TopicOverviewPanel } from "@/components/TopicOverviewPanel";
import { AllTopicsOverviewPanel } from "@/components/AllTopicsOverviewPanel";
import { LiveTranscript, type LiveTranscriptTurn } from "@/components/LiveTranscript";
import { StructuredDataWidget } from "@/components/StructuredDataWidget";
import { CallControls } from "@/components/CallControls";
import type { ConversationTopic } from "@/lib/types/database";
import type { RecentConversation, TopicHistoryEntry } from "@/app/talk/page";

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

export function TalkScreen({
  userId,
  topicHistory,
  allRecent,
}: {
  userId: string;
  topicHistory: Partial<Record<ConversationTopic, TopicHistoryEntry>>;
  allRecent: RecentConversation[];
}) {
  const [topic, setTopic] = useState<ConversationTopic | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [turns, setTurns] = useState<LiveTranscriptTurn[]>([]);
  const [liveStructuredData, setLiveStructuredData] = useState<Record<string, unknown[]>>({});
  const [isMuted, setIsMuted] = useState(false);
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
          setLiveStructuredData((prev) => ({
            ...prev,
            [meta.dataKey]: mergeStructuredDataArrays(prev[meta.dataKey] ?? [], [parsed], meta.mergeKey),
          }));
        } catch (error) {
          console.error("Failed to parse tool call arguments", error);
        }
      }
    };

    const handleCallEnd = () => {
      setCallState("idle");
      setIsMuted(false);
      conversationIdRef.current = null;
    };

    const handleError = (error: unknown) => {
      console.error("Vapi error", error);
      setErrorMessage("Something went wrong with the call. Please try again.");
      setCallState("error");
      setIsMuted(false);
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

  const startCall = useCallback(async () => {
    setErrorMessage(null);
    setTurns([]);
    setLiveStructuredData({});
    seenToolCallIdsRef.current.clear();
    setCallState("connecting");

    // Nothing picked yet -- default to General rather than blocking the call.
    const effectiveTopic = topic ?? "general";
    setTopic(effectiveTopic);

    try {
      const conversationId = crypto.randomUUID();
      conversationIdRef.current = conversationId;

      const created = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conversationId, topic: effectiveTopic }),
      });
      if (!created.ok) throw new Error("Failed to create conversation record");

      const vapi = getVapiClient();
      await vapi.start(
        buildAssistantForTopic(effectiveTopic),
        buildAssistantOverrides(userId, conversationId),
      );
    } catch (error) {
      console.error("Failed to start call", error);
      setErrorMessage("Couldn't start the call. Please check your microphone permissions and try again.");
      setCallState("error");
    }
  }, [userId, topic]);

  const stopCall = useCallback(() => {
    getVapiClient().stop();
  }, []);

  const toggleMute = useCallback(() => {
    const vapi = getVapiClient();
    const next = !isMuted;
    vapi.setMuted(next);
    setIsMuted(next);
  }, [isMuted]);

  const isCallActive = callState === "connecting" || callState === "connected";
  // Non-null once a call is active -- startCall locks in a real topic before
  // the call ever connects.
  const activeTopic = topic ?? "general";

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl">
      <CallControls
        callState={callState}
        isMuted={isMuted}
        onStart={startCall}
        onStop={stopCall}
        onToggleMute={toggleMute}
      />

      {errorMessage && <p className="text-sm text-red-600 text-center">{errorMessage}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 min-h-32">
          {isCallActive ? (
            <LiveTranscript turns={turns} />
          ) : (
            <TopicPicker value={topic} onChange={setTopic} disabled={isCallActive} />
          )}
        </div>

        <div>
          {isCallActive ? (
            activeTopic !== "general" && (
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
                <h2 className="text-sm font-medium mb-3">
                  {TOPICS[activeTopic].liveCardsTitle ?? "Details captured so far"}
                </h2>
                <StructuredDataWidget topic={activeTopic} data={liveStructuredData} />
              </div>
            )
          ) : topic === null ? (
            <AllTopicsOverviewPanel topicHistory={topicHistory} allRecent={allRecent} />
          ) : (
            <TopicOverviewPanel topic={topic} history={topicHistory[topic]} />
          )}
        </div>
      </div>
    </div>
  );
}
