"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVapiClient } from "@/lib/vapi/client";
import { buildAssistantForTopic, buildAssistantOverrides } from "@/lib/vapi/assistant-config";
import { LiveTranscript, type LiveTranscriptTurn } from "@/components/LiveTranscript";
import type { ConversationTopic } from "@/lib/types/database";

type CallState = "idle" | "connecting" | "connected" | "error";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

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
    </div>
  );
}
