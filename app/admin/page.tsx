import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TOPICS, TOPIC_ORDER } from "@/lib/vapi/assistant-config";
import { TopicOverrideForm } from "@/components/TopicOverrideForm";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/talk");
  }

  const { data: overrideRows } = await supabase.from("topic_overrides").select("*");
  const overridesByTopic = new Map((overrideRows ?? []).map((row) => [row.topic, row]));

  return (
    <main className="flex flex-1 flex-col items-center gap-6 p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-2xl font-semibold">Agent behavior</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Customize how each topic&apos;s agent talks and how the router decides when to transfer to
          it. Leave a field blank to use its default (shown as placeholder text).
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-2xl">
        {TOPIC_ORDER.map((topic) => {
          const t = TOPICS[topic];
          const row = overridesByTopic.get(topic);
          return (
            <TopicOverrideForm
              key={topic}
              topic={topic}
              label={t.label}
              defaults={{
                systemPrompt: t.systemPrompt,
                firstMessage: t.firstMessage,
                description: t.description,
              }}
              current={{
                systemPrompt: row?.system_prompt ?? null,
                firstMessage: row?.first_message ?? null,
                description: row?.description ?? null,
              }}
            />
          );
        })}
      </div>
    </main>
  );
}
