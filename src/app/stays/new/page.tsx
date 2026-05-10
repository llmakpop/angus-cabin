import Link from "next/link";
import { isValidIsoDate, toIsoDate } from "@/lib/calendar/dates";
import { createStay } from "./actions";
import { SubmitButton } from "./SubmitButton";

const STAY_TYPES = [
  {
    value: "solo",
    label: "Solo",
    description: "Just my household — book the cabin to ourselves.",
  },
  {
    value: "solo_with_guests",
    label: "Solo + guests",
    description: "My household, plus named guests who don't have accounts.",
  },
  {
    value: "multi_family",
    label: "Multi-family",
    description: "Multiple families overlapping — track sleeping spots.",
  },
  {
    value: "day_trip",
    label: "Day trip",
    description: "Stopping by for a day. No overnight, no sleeping spots.",
  },
] as const;

export default async function NewStayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string }>;
}) {
  const { date, error } = await searchParams;
  const defaultDate = isValidIsoDate(date) ? date : toIsoDate(new Date());

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <header className="space-y-1">
          <div>
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              ← Back to calendar
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">New stay</h1>
          <p className="text-sm text-zinc-500">
            Book yourself (and anyone you&apos;re bringing) at the cabin.
          </p>
        </header>

        <form action={createStay} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Stay type
            </legend>
            <div className="space-y-2">
              {STAY_TYPES.map((t, i) => (
                <label
                  key={t.value}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-300 p-3 transition-colors hover:bg-zinc-50 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-900"
                >
                  <input
                    type="radio"
                    name="stay_type"
                    value={t.value}
                    defaultChecked={i === 0}
                    className="mt-0.5"
                  />
                  <span className="block">
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-zinc-500">
                      {t.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="start_date"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Start date
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                defaultValue={defaultDate}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="end_date"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                End date
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                required
                defaultValue={defaultDate}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
              />
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            For day trips, end date is automatically set to match start date.
          </p>

          <div className="space-y-1">
            <label
              htmlFor="notes"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Notes <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Anything the family should know — meals, kids, pets, etc."
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <SubmitButton />
            <Link
              href="/"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
