import { createClient } from "@/lib/supabase/server";
import type { IsoDate } from "@/lib/calendar/dates";
import type { StayType } from "./stays";

export type DayAttendee = {
  id: string;
  display_name: string;
  is_registered_user: boolean;
  is_pet: boolean;
  is_child: boolean;
  bringing_note: string | null;
  sleep_spot_label: string | null;
};

export type DayStay = {
  id: string;
  stay_type: StayType;
  start_date: IsoDate;
  end_date: IsoDate;
  notes: string | null;
  creator_name: string | null;
  attendees: DayAttendee[];
};

// Fetch every stay covering `date`, with each stay's attendees and
// each attendee's sleep assignment for that night (if any).
export async function fetchDayDetail(date: IsoDate): Promise<DayStay[]> {
  const supabase = await createClient();

  // Query 1: stays + attendees + creator (no sleep info yet)
  const { data: stayRows, error: staysError } = await supabase
    .from("stays")
    .select(
      `
      id,
      stay_type,
      start_date,
      end_date,
      notes,
      creator:users!stays_created_by_user_id_fkey (name),
      stay_attendees (
        id,
        guest_name,
        is_pet,
        is_child,
        bringing_note,
        user:users (name)
      )
      `,
    )
    .lte("start_date", date)
    .gte("end_date", date)
    .order("start_date", { ascending: true });

  if (staysError) {
    console.error("fetchDayDetail stays:", staysError);
    return [];
  }

  // Query 2: sleep assignments for this specific night, keyed by attendee
  const { data: assignmentRows, error: asgError } = await supabase
    .from("sleep_assignments")
    .select(
      `
      attendee_id,
      sleep_spot:sleep_spots (label)
      `,
    )
    .eq("night_date", date);

  if (asgError) {
    console.error("fetchDayDetail assignments:", asgError);
  }

  const spotByAttendee = new Map<string, string>();
  for (const row of assignmentRows ?? []) {
    const spot = Array.isArray(row.sleep_spot) ? row.sleep_spot[0] : row.sleep_spot;
    if (row.attendee_id && spot?.label) {
      spotByAttendee.set(row.attendee_id, spot.label);
    }
  }

  return (stayRows ?? []).map((row) => {
    const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator;
    const attendees: DayAttendee[] = (row.stay_attendees ?? []).map((a) => {
      const userObj = Array.isArray(a.user) ? a.user[0] : a.user;
      const isRegistered = !!userObj;
      return {
        id: a.id,
        display_name: userObj?.name ?? a.guest_name ?? "Unknown",
        is_registered_user: isRegistered,
        is_pet: a.is_pet,
        is_child: a.is_child,
        bringing_note: a.bringing_note,
        sleep_spot_label: spotByAttendee.get(a.id) ?? null,
      };
    });
    return {
      id: row.id,
      stay_type: row.stay_type,
      start_date: row.start_date,
      end_date: row.end_date,
      notes: row.notes,
      creator_name: creator?.name ?? null,
      attendees,
    };
  });
}
