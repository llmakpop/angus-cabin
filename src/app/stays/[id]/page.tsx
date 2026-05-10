import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  fetchStayDetail,
  fetchFamilyMembers,
  type StayDetailAttendee,
} from "@/lib/queries/stay-detail";
import { fetchStaySleepInfo } from "@/lib/queries/stay-sleep";
import {
  formatDateLong,
  fromIsoDate,
  toMonthParam,
} from "@/lib/calendar/dates";
import { addAttendee, removeAttendee, setNightAssignments } from "./actions";

const STAY_TYPE_LABELS = {
  solo: "Solo",
  solo_with_guests: "Solo + guests",
  multi_family: "Multi-family",
  day_trip: "Day trip",
} as const;

function attendeeLabel(a: StayDetailAttendee, isCreator: boolean): string {
  const base = a.user_name ?? a.guest_name ?? "Unknown";
  const parts: string[] = [];
  if (isCreator) parts.push("creator");
  if (a.is_child) parts.push("child");
  if (a.is_pet) parts.push("pet");
  if (!a.user_id && !a.is_pet) parts.push("guest");
  return parts.length > 0 ? `${base} (${parts.join(", ")})` : base;
}

export default async function StayDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;

  const stay = await fetchStayDetail(id);
  if (!stay) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";
  const canEdit = isAdmin || stay.created_by_user_id === user.id;

  const family = canEdit ? await fetchFamilyMembers() : [];
  const alreadyAttendingUserIds = new Set(
    stay.attendees.map((a) => a.user_id).filter((u): u is string => !!u),
  );
  const availableFamily = family.filter(
    (f) => !alreadyAttendingUserIds.has(f.id),
  );

  const showSleepSection =
    stay.stay_type !== "day_trip" && stay.attendees.length > 0;
  const sleep = showSleepSection
    ? await fetchStaySleepInfo(stay.id, stay.start_date, stay.end_date)
    : null;

  const calendarBackHref = `/?month=${toMonthParam(fromIsoDate(stay.start_date))}&date=${stay.start_date}`;
  const dateLabel =
    stay.start_date === stay.end_date
      ? formatDateLong(fromIsoDate(stay.start_date))
      : `${formatDateLong(fromIsoDate(stay.start_date))} → ${formatDateLong(fromIsoDate(stay.end_date))}`;

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <div className="mb-4">
        <Link
          href={calendarBackHref}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to calendar
        </Link>
      </div>

      <header className="mb-6 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {STAY_TYPE_LABELS[stay.stay_type]}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {stay.creator_name ?? "Someone"} hosting
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{dateLabel}</p>
        {stay.notes ? (
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {stay.notes}
          </p>
        ) : null}
      </header>

      {errorParam ? (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {errorParam}
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-base font-semibold">
          Attendees ({stay.attendees.length})
        </h2>

        {stay.attendees.length === 0 ? (
          <p className="text-sm text-zinc-500">No attendees yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {stay.attendees.map((a) => {
              const isCreator = a.user_id === stay.created_by_user_id;
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {attendeeLabel(a, isCreator)}
                    </p>
                    {a.bringing_note ? (
                      <p className="truncate text-xs text-zinc-500">
                        bringing: {a.bringing_note}
                      </p>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <form action={removeAttendee.bind(null, stay.id, a.id)}>
                      <button
                        type="submit"
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-red-400"
                      >
                        Remove
                      </button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {canEdit ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <form
              action={addAttendee.bind(null, stay.id)}
              className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <p className="text-sm font-medium">Add family member</p>
              <select
                name="user_id"
                required
                defaultValue=""
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="" disabled>
                  Select a person…
                </option>
                {availableFamily.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.household_name ? ` · ${f.household_name}` : ""}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <input type="checkbox" name="is_child" /> Child
              </label>
              <input
                type="text"
                name="bringing_note"
                placeholder="Bringing (optional)"
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Add family member
              </button>
            </form>

            <form
              action={addAttendee.bind(null, stay.id)}
              className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <p className="text-sm font-medium">Add guest</p>
              <input
                type="text"
                name="guest_name"
                required
                placeholder="Guest name"
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <div className="flex gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                <label className="flex items-center gap-1">
                  <input type="checkbox" name="is_child" /> Child
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" name="is_pet" /> Pet
                </label>
              </div>
              <input
                type="text"
                name="bringing_note"
                placeholder="Bringing (optional)"
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Add guest
              </button>
            </form>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Only {stay.creator_name ?? "the creator"} or an admin can edit
            attendees on this stay.
          </p>
        )}
      </section>

      {sleep && sleep.nights.length > 0 ? (
        <section className="mt-8 space-y-4">
          <h2 className="text-base font-semibold">Sleep assignments</h2>
          <p className="text-xs text-zinc-500">
            Capacity is shown but not enforced — the cabin flexes.
          </p>

          {sleep.nights.map((night) => (
            <form
              key={night.date}
              action={setNightAssignments.bind(null, stay.id, night.date)}
              className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <header className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">
                  {formatDateLong(fromIsoDate(night.date))} night
                </h3>
                {canEdit ? (
                  <button
                    type="submit"
                    className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Save night
                  </button>
                ) : null}
              </header>
              <ul className="space-y-2">
                {stay.attendees.map((a) => {
                  const currentSpot = night.assignments.get(a.id)
                    ?.sleep_spot_id;
                  const displayName =
                    a.user_name ?? a.guest_name ?? "Unknown";
                  return (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span className="min-w-32 flex-1 text-sm">
                        {displayName}
                        {a.is_pet ? " 🐾" : ""}
                        {a.is_child ? " (child)" : ""}
                      </span>
                      <select
                        name={`spot_for_${a.id}`}
                        defaultValue={currentSpot ?? ""}
                        disabled={!canEdit}
                        className="flex-1 min-w-48 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
                      >
                        <option value="">Unassigned</option>
                        {sleep.spots.map((spot) => {
                          const occupied =
                            night.occupancyBySpot.get(spot.id) ?? 0;
                          const isMine = currentSpot === spot.id;
                          // Remaining count, treating "this attendee here" as
                          // already counted so the dropdown stays accurate.
                          const remaining =
                            spot.capacity - occupied + (isMine ? 1 : 0);
                          const isFull = remaining <= 0;
                          const flagSuffix =
                            spot.flags.length > 0
                              ? ` — ${spot.flags.join(", ")}`
                              : "";
                          return (
                            <option
                              key={spot.id}
                              value={spot.id}
                              disabled={isFull && !isMine}
                            >
                              {spot.label} ({remaining}/{spot.capacity})
                              {flagSuffix}
                            </option>
                          );
                        })}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </form>
          ))}
        </section>
      ) : null}
    </main>
  );
}
