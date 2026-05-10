import { createClient } from "@/lib/supabase/server";
import { fromIsoDate, toIsoDate, type IsoDate } from "@/lib/calendar/dates";

export type SleepSpot = {
  id: string;
  label: string;
  capacity: number;
  flags: string[];
  sort_order: number;
};

export type StayNight = {
  date: IsoDate;
  // Per-attendee assignment for this night, keyed by attendee_id.
  assignments: Map<string, { sleep_spot_id: string }>;
  // Per-spot occupancy across ALL stays on this night.
  occupancyBySpot: Map<string, number>;
};

export type StaySleepInfo = {
  spots: SleepSpot[];
  nights: StayNight[];
};

// Returns the list of nights between start_date (inclusive) and end_date
// (exclusive). For an overnight stay May 15 → May 17, that's [15, 16].
export function nightsForStay(startIso: IsoDate, endIso: IsoDate): IsoDate[] {
  const nights: IsoDate[] = [];
  const cursor = fromIsoDate(startIso);
  const lastDay = fromIsoDate(endIso);
  while (cursor < lastDay) {
    nights.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return nights;
}

export async function fetchStaySleepInfo(
  stayId: string,
  startIso: IsoDate,
  endIso: IsoDate,
): Promise<StaySleepInfo> {
  const supabase = await createClient();
  const nightDates = nightsForStay(startIso, endIso);

  if (nightDates.length === 0) {
    return { spots: [], nights: [] };
  }

  // 1. All sleep spots, sorted
  const { data: spotData } = await supabase
    .from("sleep_spots")
    .select("id, label, capacity, flags, sort_order")
    .order("sort_order");
  const spots: SleepSpot[] = spotData ?? [];

  // 2. This stay's existing assignments
  const { data: stayAssignments } = await supabase
    .from("sleep_assignments")
    .select("attendee_id, sleep_spot_id, night_date")
    .eq("stay_id", stayId)
    .in("night_date", nightDates);

  // 3. Occupancy across ALL stays for these nights (for capacity display)
  const { data: globalAssignments } = await supabase
    .from("sleep_assignments")
    .select("sleep_spot_id, night_date")
    .in("night_date", nightDates);

  const nights: StayNight[] = nightDates.map((date) => {
    const assignments = new Map<string, { sleep_spot_id: string }>();
    for (const row of stayAssignments ?? []) {
      if (row.night_date === date) {
        assignments.set(row.attendee_id, { sleep_spot_id: row.sleep_spot_id });
      }
    }
    const occupancyBySpot = new Map<string, number>();
    for (const row of globalAssignments ?? []) {
      if (row.night_date === date) {
        occupancyBySpot.set(
          row.sleep_spot_id,
          (occupancyBySpot.get(row.sleep_spot_id) ?? 0) + 1,
        );
      }
    }
    return { date, assignments, occupancyBySpot };
  });

  return { spots, nights };
}
