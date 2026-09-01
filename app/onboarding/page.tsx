import { RoleSelectForm } from "@/components/RoleSelectForm";

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Welcome to CareNav.ai</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Just a couple quick details before we get started.
        </p>
      </div>
      <RoleSelectForm />
    </main>
  );
}
