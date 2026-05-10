import { createClient } from "@/lib/supabase/server";
import type { StayType } from "./stays";
import type { IsoDate } from "@/lib/calendar/dates";

export type StayDetailAttendee = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  guest_name: string | null;
  is_pet: boolean;
  is_child: boolean;
  bringing_note: string | null;
};

export type StayDetail = {
  id: string;
  stay_type: StayType;
  start_date: IsoDate;
  end_date: IsoDate;
  notes: string | null;
  created_by_user_id: string;
  creator_name: string | null;
  attendees: StayDetailAttendee[];
};

export async function fetchStayDetail(id: string): Promise<StayDetail | null> {
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
      created_by_user_id,
      creator:users!stays_created_by_user_id_fkey (name),
      stay_attendees (
        id,
        user_id,
        guest_name,
        is_pet,
        is_child,
        bringing_note,
        user:users (name)
      )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("fetchStayDetail:", error);
    return null;
  }

  const creator = Array.isArray(data.creator) ? data.creator[0] : data.creator;

  const attendees: StayDetailAttendee[] = (data.stay_attendees ?? [])
    .map((a) => {
      const userObj = Array.isArray(a.user) ? a.user[0] : a.user;
      return {
        id: a.id,
        user_id: a.user_id,
        user_name: userObj?.name ?? null,
        guest_name: a.guest_name,
        is_pet: a.is_pet,
        is_child: a.is_child,
        bringing_note: a.bringing_note,
      };
    })
    .sort((a, b) => {
      const an = (a.user_name ?? a.guest_name ?? "").toLocaleLowerCase();
      const bn = (b.user_name ?? b.guest_name ?? "").toLocaleLowerCase();
      return an.localeCompare(bn);
    });

  return {
    id: data.id,
    stay_type: data.stay_type,
    start_date: data.start_date,
    end_date: data.end_date,
    notes: data.notes,
    created_by_user_id: data.created_by_user_id,
    creator_name: creator?.name ?? null,
    attendees,
  };
}

export type FamilyMember = {
  id: string;
  name: string;
  household_name: string | null;
};

// Returns all family members, sorted by name. The detail page uses this to
// populate the "Add family member" dropdown.
export async function fetchFamilyMembers(): Promise<FamilyMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      `
      id,
      name,
      household:households (name)
      `,
    )
    .order("name");

  if (error || !data) return [];
  return data.map((u) => {
    const household = Array.isArray(u.household) ? u.household[0] : u.household;
    return {
      id: u.id,
      name: u.name,
      household_name: household?.name ?? null,
    };
  });
}
