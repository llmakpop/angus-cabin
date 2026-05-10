import { createClient } from "@/lib/supabase/server";
import type { IsoDate } from "@/lib/calendar/dates";

export type StayType = "solo" | "solo_with_guests" | "multi_family" | "day_trip";

export type CalendarStay = {
  id: string;
  stay_type: StayType;
  start_date: IsoDate;
  end_date: IsoDate;
  notes: string | null;
  creator: { id: string; name: string; household_id: string | null } | null;
};

// Fetch all stays whose date range overlaps [startIso, endIso] (inclusive).
// Used to populate the calendar's visible month.
export async function fetchStaysOverlappingRange(
  startIso: IsoDate,
  endIso: IsoDate,
): Promise<CalendarStay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stays")
    .select(
      `
      id,
      stay_type,
      start_date,
      end_date,
      notes,
      creator:users!stays_created_by_user_id_fkey (id, name, household_id)
      `,
    )
    .lte("start_date", endIso)
    .gte("end_date", startIso)
    .order("start_date", { ascending: true });

  if (error) {
    console.error("fetchStaysOverlappingRange failed:", error);
    return [];
  }

  // Supabase types `creator` as an array even for single relations — flatten.
  return (data ?? []).map((row) => ({
    ...row,
    creator: Array.isArray(row.creator) ? row.creator[0] ?? null : row.creator,
  })) as CalendarStay[];
}
