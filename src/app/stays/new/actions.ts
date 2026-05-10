"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isValidIsoDate,
  fromIsoDate,
  toMonthParam,
} from "@/lib/calendar/dates";
import type { StayType } from "@/lib/queries/stays";

const VALID_TYPES: StayType[] = [
  "solo",
  "solo_with_guests",
  "multi_family",
  "day_trip",
];

function failBack(message: string, defaults?: { date?: string }): never {
  const params = new URLSearchParams();
  params.set("error", message);
  if (defaults?.date) params.set("date", defaults.date);
  redirect(`/stays/new?${params.toString()}`);
}

export async function createStay(formData: FormData) {
  const stayType = String(formData.get("stay_type") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  let endDate = String(formData.get("end_date") ?? "");
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;

  if (!VALID_TYPES.includes(stayType as StayType)) {
    failBack("Pick a stay type.");
  }
  if (!isValidIsoDate(startDate)) {
    failBack("Start date is required.");
  }

  // Day trips collapse to a single day regardless of what was submitted.
  if (stayType === "day_trip") {
    endDate = startDate;
  }
  if (!isValidIsoDate(endDate)) {
    endDate = startDate;
  }
  if (endDate < startDate) {
    failBack("End date must be on or after start date.", { date: startDate });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("stays").insert({
    created_by_user_id: user.id,
    stay_type: stayType as StayType,
    start_date: startDate,
    end_date: endDate,
    notes,
  });

  if (error) {
    failBack(error.message, { date: startDate });
  }

  const monthParam = toMonthParam(fromIsoDate(startDate));
  redirect(`/?month=${monthParam}&date=${startDate}`);
}
