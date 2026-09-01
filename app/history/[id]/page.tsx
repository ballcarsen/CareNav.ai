import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ConversationDetail } from "@/components/ConversationDetail";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!conversation) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col max-w-2xl mx-auto w-full p-8">
      <Link href="/history" className="text-sm text-amber-700 dark:text-amber-500 hover:underline mb-6">
        ← Back to history
      </Link>
      <ConversationDetail conversation={conversation} />
    </main>
  );
}
