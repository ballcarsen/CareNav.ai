"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/onboarding/actions";
import type { ProfileRole } from "@/lib/types/database";

export function RoleSelectForm() {
  const router = useRouter();
  const [role, setRole] = useState<ProfileRole>("patient");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await completeOnboarding({ role, displayName });
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push("/talk");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Who&apos;s talking with the care navigator?</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRole("patient")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${
              role === "patient"
                ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                : "border-black/10 dark:border-white/20"
            }`}
          >
            I am the patient
          </button>
          <button
            type="button"
            onClick={() => setRole("family_member")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${
              role === "family_member"
                ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                : "border-black/10 dark:border-white/20"
            }`}
          >
            I am family/caregiver
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Your name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 text-sm font-medium"
      >
        {loading ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
