import { HoursScreen } from "@/components/hours/HoursScreen";
import { requireProfile } from "@/modules/auth/session";
import { dateKeyOf } from "@/modules/time/calc";

/**
 * Первый экран приходит с сервера — профиль уже готов к первому кадру
 * (открытая смена приходит из общего `ShiftProvider`). Дальше (смена периода, даты, действия) экран сам ходит в
 * Supabase из браузера — это `HoursScreen`.
 */
export default async function HoursPage() {
  const profile = await requireProfile();
  const today = dateKeyOf(new Date());

  return (
    <HoursScreen
      profile={profile}
      initialDate={today}
    />
  );
}
