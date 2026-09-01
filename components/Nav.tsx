"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Nav() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
      <Link href="/talk" className="font-semibold">
        CareNav.ai
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/talk" className="hover:underline">
          Talk
        </Link>
        <Link href="/history" className="hover:underline">
          History
        </Link>
        <button onClick={handleSignOut} className="hover:underline text-stone-500 dark:text-stone-400">
          Sign out
        </button>
      </div>
    </nav>
  );
}
