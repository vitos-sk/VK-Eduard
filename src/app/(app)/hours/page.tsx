import { HoursScreen } from "@/components/hours/HoursScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getOpenEntry } from "@/modules/entries/queries";
import { dateKeyOf } from "@/modules/time/calc";

/**
 * Первый экран приходит с сервера — своё имя и открытая смена уже готовы к
 * первому кадру. Дальше (смена периода, даты, действия) экран сам ходит в
 * Supabase из браузера — это `HoursScreen`.
 */
export default async function HoursPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = dateKeyOf(new Date());

  const initialOpenEntry = await getOpenEntry(supabase, profile.id);

  return (
    <HoursScreen
      profile={profile}
      initialDate={today}
      initialOpenEntry={initialOpenEntry}
    />
  );
}
