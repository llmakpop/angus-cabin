"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function failBack(stayId: string, message: string): never {
  redirect(`/stays/${stayId}?error=${encodeURIComponent(message)}`);
}

export async function addAttendee(stayId: string, formData: FormData) {
  const userId = String(formData.get("user_id") ?? "").trim();
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const isPet = formData.get("is_pet") === "on";
  const isChild = formData.get("is_child") === "on";
  const bringingRaw = String(formData.get("bringing_note") ?? "").trim();
  const bringingNote = bringingRaw.length > 0 ? bringingRaw : null;

  if (!userId && !guestName) {
    failBack(stayId, "Pick a family member or enter a guest name.");
  }
  if (userId && guestName) {
    failBack(stayId, "Choose either a family member OR a guest, not both.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("stay_attendees").insert({
    stay_id: stayId,
    user_id: userId || null,
    guest_name: guestName || null,
    is_pet: isPet,
    is_child: isChild,
    bringing_note: bringingNote,
  });

  if (error) failBack(stayId, error.message);
  revalidatePath(`/stays/${stayId}`);
}

export async function removeAttendee(stayId: string, attendeeId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("stay_attendees")
    .delete()
    .eq("id", attendeeId);
  if (error) failBack(stayId, error.message);
  revalidatePath(`/stays/${stayId}`);
}
