import { SalaryScreen } from "@/components/hours/SalaryScreen";
import { requireProfile } from "@/modules/auth/session";
import { dateKeyOf } from "@/modules/time/calc";

/** Страница калькулятора зарплаты: месяц приходит из «Годин» (`?month=ГГГГ-ММ`), по умолчанию — текущий. */
export default async function SalaryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const profile = await requireProfile();
  const valid = month && /^\d{4}-\d{2}$/.test(month) ? month : null;

  return <SalaryScreen profile={profile} initialDate={valid ? `${valid}-01` : dateKeyOf(new Date())} />;
}
