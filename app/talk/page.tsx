import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TalkScreen } from "@/components/TalkScreen";

export default async function TalkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Talk with your care navigator</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ask about appointments, referrals, insurance, or finding local resources.
        </p>
      </div>
      <TalkScreen userId={user.id} />
    </main>
  );
}
