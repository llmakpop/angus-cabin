import Link from "next/link";
import { fetchDayDetail, type DayStay } from "@/lib/queries/day-detail";
import { formatDateLong, fromIsoDate, type IsoDate } from "@/lib/calendar/dates";

const STAY_TYPE_LABELS: Record<DayStay["stay_type"], string> = {
  solo: "Solo",
  solo_with_guests: "Solo + guests",
  multi_family: "Multi-family",
  day_trip: "Day trip",
};

export async function DayDrawer({
  date,
  closeHref,
}: {
  date: IsoDate;
  closeHref: string;
}) {
  const stays = await fetchDayDetail(date);
  const heading = formatDateLong(fromIsoDate(date));

  return (
    <>
      {/* Backdrop (mobile only — desktop drawer doesn't darken the page) */}
      <Link
        href={closeHref}
        className="fixed inset-0 z-30 bg-black/30 sm:hidden"
        aria-label="Close"
      />

      <aside className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950 sm:w-96">
        <header className="flex items-start justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              {heading}
            </h3>
            <p className="text-xs text-zinc-500">
              {stays.length === 0
                ? "Nobody at the cabin"
                : `${stays.length} stay${stays.length === 1 ? "" : "s"} this day`}
            </p>
          </div>
          <Link
            href={closeHref}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            aria-label="Close"
          >
            ✕
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {stays.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">
                No stays scheduled.
              </p>
              <Link
                href={`/stays/new?date=${date}`}
                className="inline-block rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                + Book this day
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {stays.map((stay) => (
                <li
                  key={stay.id}
                  className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {STAY_TYPE_LABELS[stay.stay_type]}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {stay.start_date === stay.end_date
                        ? stay.start_date
                        : `${stay.start_date} → ${stay.end_date}`}
                    </span>
                  </div>

                  <p className="text-sm font-medium">
                    {stay.creator_name ?? "Unknown"} hosting
                  </p>

                  {stay.notes ? (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {stay.notes}
                    </p>
                  ) : null}

                  {stay.attendees.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Who&apos;s here
                      </p>
                      <ul className="mt-1 space-y-1 text-sm">
                        {stay.attendees.map((a) => (
                          <li key={a.id} className="flex flex-wrap items-baseline gap-x-2">
                            <span>
                              {a.display_name}
                              {a.is_pet ? " 🐾" : ""}
                              {a.is_child ? " (child)" : ""}
                              {!a.is_registered_user && !a.is_pet
                                ? " (guest)"
                                : ""}
                            </span>
                            {a.sleep_spot_label && stay.stay_type !== "day_trip" ? (
                              <span className="text-xs text-zinc-500">
                                — {a.sleep_spot_label}
                              </span>
                            ) : null}
                            {a.bringing_note ? (
                              <span className="text-xs text-zinc-500">
                                — bringing: {a.bringing_note}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-zinc-500">
                      No attendees listed yet.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
