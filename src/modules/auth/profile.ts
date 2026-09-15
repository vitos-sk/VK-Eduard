import type { Tables } from "@/lib/supabase/types.gen";

export type Profile = Tables<"profiles">;

/** Первая буква имени для кружка-аватара. */
export function initialsOf(profile: Pick<Profile, "full_name">): string {
  return profile.full_name.trim().charAt(0).toUpperCase();
}
