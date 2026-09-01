"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/types/database";

export async function completeOnboarding({
  role,
  displayName,
}: {
  role: ProfileRole;
  displayName: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role,
      display_name: displayName.trim() || null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
