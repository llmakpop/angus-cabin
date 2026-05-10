import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware guarantees user is non-null here, but TS doesn't know that.
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("name, role, household_id")
    .eq("id", user.id)
    .single();

  const displayName = profile?.name ?? user.email ?? "friend";

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Angus Cabin
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Hi, {displayName}! You&apos;re signed in.
          </p>
        </header>

        <p className="text-sm text-zinc-500">
          Calendar and stay booking coming soon.
        </p>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
