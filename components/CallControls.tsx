"use client";

type CallState = "idle" | "connecting" | "connected" | "error";

export function CallControls({
  callState,
  isMuted,
  onStart,
  onStop,
  onToggleMute,
}: {
  callState: CallState;
  isMuted: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
}) {
  if (callState === "connected") {
    return (
      <div className="flex justify-center gap-3">
        <button
          onClick={onToggleMute}
          className="rounded-full border border-black/10 dark:border-white/20 hover:bg-black/[.03] dark:hover:bg-white/[.06] px-6 py-3 font-medium transition-colors"
        >
          {isMuted ? "Resume" : "Pause"}
        </button>
        <button
          onClick={onStop}
          className="rounded-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 font-medium transition-colors"
        >
          End conversation
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <button
        onClick={onStart}
        disabled={callState === "connecting"}
        className="rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-8 py-4 font-medium transition-colors"
      >
        {callState === "connecting" ? "Connecting..." : "Start conversation"}
      </button>
    </div>
  );
}
