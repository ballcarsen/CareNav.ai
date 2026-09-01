import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationList } from "@/components/ConversationList";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  return (
    <main className="flex flex-1 flex-col max-w-2xl mx-auto w-full p-8">
      <h1 className="text-2xl font-semibold mb-6">Conversation history</h1>
      <ConversationList conversations={conversations ?? []} />
    </main>
  );
}
