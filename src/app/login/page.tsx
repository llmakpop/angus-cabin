import { sendMagicLink } from "./actions";

type LoginSearchParams = {
  sent?: string;
  email?: string;
  error?: string;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const { sent, email, error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Angus Cabin
          </h1>
          <p className="text-sm text-zinc-500">
            Sign in with your email to see who&apos;s at the cabin.
          </p>
        </header>

        {sent ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-medium">Check your email.</p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              We sent a sign-in link to{" "}
              <span className="font-medium">{email}</span>. Click it from the
              same browser.
            </p>
          </div>
        ) : (
          <form action={sendMagicLink} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Send magic link
            </button>
            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : null}
          </form>
        )}
      </div>
    </main>
  );
}
