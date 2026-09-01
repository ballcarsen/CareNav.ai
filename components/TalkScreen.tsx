"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVapiClient } from "@/lib/vapi/client";
import { buildSquad, TOPICS, TOPIC_BY_ASSISTANT_NAME, TOOL_LIVE_META } from "@/lib/vapi/assistant-config";
import { mergeStructuredDataArrays } from "@/lib/vapi/structured-data-merge";
import { TopicOverviewPanel } from "@/components/TopicOverviewPanel";
import { AllTopicsOverviewPanel } from "@/components/AllTopicsOverviewPanel";
import { LiveTranscript, type LiveTranscriptTurn } from "@/components/LiveTranscript";
import { StructuredDataWidget } from "@/components/StructuredDataWidget";
import { CallControls } from "@/components/CallControls";
import type { ConversationTopic } from "@/lib/types/database";
import type { TopicHistoryEntry } from "@/app/talk/page";

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
}: {
  userId: string;
  topicHistory: Partial<Record<ConversationTopic, TopicHistoryEntry>>;
}) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [turns, setTurns] = useState<LiveTranscriptTurn[]>([]);
  const [liveStructuredData, setLiveStructuredData] = useState<Record<string, unknown[]>>({});
  const [topicsCovered, setTopicsCovered] = useState<ConversationTopic[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const seenToolCallIdsRef = useRef<Set<string>>(new Set());

  const recordTopic = useCallback((topic: ConversationTopic) => {
    setTopicsCovered((prev) => (prev.includes(topic) ? prev : [...prev, topic]));

    const conversationId = conversationIdRef.current;
    if (!conversationId) return;
    fetch("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: conversationId, topic }),
    }).catch((error) => {
      console.error("Failed to record topic transfer", error);
    });
  }, []);

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
        toAssistant?: { name?: string };
      };

      if (m.type === "transcript" && m.transcriptType === "final" && m.role && m.transcript) {
        setTurns((prev) => [...prev, { role: m.role!, text: m.transcript! }]);
      }

      if (m.type === "transfer-update" && m.toAssistant?.name) {
        const topic = TOPIC_BY_ASSISTANT_NAME[m.toAssistant.name];
        if (topic) recordTopic(topic);
      }

      const toolCalls: RawToolCall[] = [];
      findToolCalls(message, toolCalls, seenToolCallIdsRef.current);
      for (const call of toolCalls) {
        const meta = TOOL_LIVE_META[call.name];
        if (!meta) continue;
        try {
          const parsed = JSON.parse(call.args) as Record<string, unknown>;
          // Tools like record_allergy report a single scalar field (matching
          // the flat string[] shape the post-call schema and widgets expect)
          // rather than the whole object -- otherwise a raw object ends up in
          // the array and crashes the widget when it renders it as text.
          const entry = meta.scalarField ? parsed[meta.scalarField] : parsed;
          if (entry === undefined || entry === null) continue;
          setLiveStructuredData((prev) => ({
            ...prev,
            [meta.dataKey]: mergeStructuredDataArrays(prev[meta.dataKey] ?? [], [entry], meta.mergeKey),
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
      const type = (error as { type?: string } | undefined)?.type;
      // Vapi emits some non-fatal issues (noise-cancellation/audio-processor
      // setup, camera/video-recording setup) on the same 'error' event as real
      // failures -- per the SDK's own source, "audio processing is
      // non-critical, so the call continues." Only genuinely fatal errors
      // (call/transport failures, validation) should interrupt the UI.
      if (type && /^(audio-|video-recording-setup-error$|camera-error$)/.test(type)) {
        console.warn("Non-fatal Vapi error (call continues):", error);
        return;
      }

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
  }, [recordTopic]);

  const startCall = useCallback(async () => {
    setErrorMessage(null);
    setTurns([]);
    setLiveStructuredData({});
    setTopicsCovered(["general"]);
    seenToolCallIdsRef.current.clear();
    setCallState("connecting");

    try {
      const conversationId = crypto.randomUUID();
      conversationIdRef.current = conversationId;

      const created = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conversationId }),
      });
      if (!created.ok) throw new Error("Failed to create conversation record");

      const vapi = getVapiClient();
      await vapi.start(undefined, undefined, buildSquad(userId, conversationId));
    } catch (error) {
      console.error("Failed to start call", error);
      setErrorMessage("Couldn't start the call. Please check your microphone permissions and try again.");
      setCallState("error");
    }
  }, [userId]);

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
  const specialistTopics = topicsCovered.filter((t) => t !== "general");

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

      {isCallActive ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 min-h-32">
            <LiveTranscript turns={turns} />
          </div>

          <div className="flex flex-col gap-4">
            {specialistTopics.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Once we know what you&apos;d like to talk about, details will show up here.
              </p>
            ) : (
              specialistTopics.map((t) => (
                <div key={t} className="flex flex-col gap-4">
                  <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
                    <h2 className="text-sm font-medium mb-3">
                      {TOPICS[t].liveCardsTitle ?? "Details captured so far"}
                    </h2>
                    <StructuredDataWidget topic={t} data={liveStructuredData} />
                  </div>
                  <TopicOverviewPanel topic={t} history={topicHistory[t]} />
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <AllTopicsOverviewPanel topicHistory={topicHistory} />
      )}
    </div>
  );
}
