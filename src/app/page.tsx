import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { fetchStaysOverlappingRange, type CalendarStay } from "@/lib/queries/stays";
import {
  parseMonthParam,
  toMonthParam,
  addMonths,
  buildMonthGrid,
  monthLabel,
  toIsoDate,
  DAY_OF_WEEK_LABELS,
} from "@/lib/calendar/dates";

const STAY_TYPE_COLORS: Record<CalendarStay["stay_type"], string> = {
  solo: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
  solo_with_guests:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  multi_family:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  day_trip:
    "bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = parseMonthParam(monthParam);
  const days = buildMonthGrid(month);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const stays = await fetchStaysOverlappingRange(
    toIsoDate(days[0]),
    toIsoDate(days[days.length - 1]),
  );

  // Index stays by every day they cover so the grid can render in O(1) per cell.
  const staysByDay = new Map<string, CalendarStay[]>();
  for (const stay of stays) {
    const cursor = new Date(stay.start_date);
    const last = new Date(stay.end_date);
    while (cursor <= last) {
      const iso = toIsoDate(cursor);
      const existing = staysByDay.get(iso) ?? [];
      existing.push(stay);
      staysByDay.set(iso, existing);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const todayIso = toIsoDate(new Date());
  const thisMonthParam = toMonthParam(new Date());
  const prevMonthParam = toMonthParam(addMonths(month, -1));
  const nextMonthParam = toMonthParam(addMonths(month, 1));

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Angus Cabin</h1>
          <p className="text-xs text-zinc-500">
            Signed in as {profile?.name ?? user.email}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {monthLabel(month)}
          </h2>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href={`/?month=${prevMonthParam}`}
              className="rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              aria-label="Previous month"
            >
              ←
            </Link>
            <Link
              href={`/?month=${thisMonthParam}`}
              className="rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Today
            </Link>
            <Link
              href={`/?month=${nextMonthParam}`}
              className="rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              aria-label="Next month"
            >
              →
            </Link>
          </nav>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800">
          {DAY_OF_WEEK_LABELS.map((label) => (
            <div
              key={label}
              className="bg-zinc-50 px-2 py-1 text-center text-xs font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-900"
            >
              {label}
            </div>
          ))}

          {days.map((day) => {
            const iso = toIsoDate(day);
            const inMonth = day.getMonth() === month.getMonth();
            const dayStays = staysByDay.get(iso) ?? [];
            const isToday = iso === todayIso;
            return (
              <div
                key={iso}
                className={`min-h-24 bg-white p-1.5 dark:bg-zinc-950 ${
                  inMonth ? "" : "opacity-50"
                }`}
              >
                <div
                  className={`mb-1 text-xs ${
                    isToday
                      ? "inline-block rounded-full bg-zinc-900 px-1.5 py-0.5 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayStays.map((stay) => (
                    <div
                      key={stay.id}
                      className={`truncate rounded px-1 py-0.5 text-xs ${STAY_TYPE_COLORS[stay.stay_type]}`}
                      title={stay.notes ?? ""}
                    >
                      {stay.creator?.name ?? "Stay"}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
