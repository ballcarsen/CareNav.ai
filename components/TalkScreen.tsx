"use client";

import { useCallback, useState } from "react";
import { TopicPicker } from "@/components/TopicPicker";
import { StartStopCallButton } from "@/components/StartStopCallButton";
import type { ConversationTopic } from "@/lib/types/database";

export function TalkScreen({ userId }: { userId: string }) {
  const [topic, setTopic] = useState<ConversationTopic>("general");
  const [callActive, setCallActive] = useState(false);

  const handleCallActiveChange = useCallback((active: boolean) => {
    setCallActive(active);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <TopicPicker value={topic} onChange={setTopic} disabled={callActive} />
      <StartStopCallButton userId={userId} topic={topic} onCallActiveChange={handleCallActiveChange} />
    </div>
  );
}
