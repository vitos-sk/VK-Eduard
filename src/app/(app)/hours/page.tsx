import { HoursScreen } from "@/components/hours/HoursScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getEntriesForDate, getOpenEntry } from "@/modules/entries/queries";
import { getActiveSites } from "@/modules/sites/queries";
import { dateKeyOf } from "@/modules/time/calc";

/**
 * Первый экран приходит с сервера — своё имя, объекты компании и записи
 * сегодняшнего дня уже готовы к первому кадру. Дальше (смена периода, даты,
 * действия) экран сам ходит в Supabase из браузера — это `HoursScreen`.
 */
export default async function HoursPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = dateKeyOf(new Date());

  const [initialEntries, initialOpenEntry, sites] = await Promise.all([
    getEntriesForDate(supabase, profile.id, today),
    getOpenEntry(supabase, profile.id),
    getActiveSites(supabase),
  ]);

  return (
    <HoursScreen
      profile={profile}
      sites={sites}
      initialDate={today}
      initialEntries={initialEntries}
      initialOpenEntry={initialOpenEntry}
    />
  );
}
