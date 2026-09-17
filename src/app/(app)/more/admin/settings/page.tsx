import { CompanyDailyNormForm } from "@/components/more/admin/settings/CompanyDailyNormForm";
import { WorkCategoriesManager } from "@/components/more/admin/settings/WorkCategoriesManager";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompany } from "@/modules/company/queries";
import { getAllWorkCategoriesForAdmin } from "@/modules/reports/queries";

const DEFAULT_DAILY_NORM_MINUTES = 480;

/**
 * Розділ «Налаштування» адмінки — тільки `boss`. Роль перевіряє `layout.tsx`.
 * Дві незалежні секції: денна норма годин компанії за замовчуванням і
 * керування категоріями робіт.
 */
export default async function AdminSettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [company, categories] = await Promise.all([
    getCompany(supabase, profile.company_id),
    getAllWorkCategoriesForAdmin(supabase, profile.company_id),
  ]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 lg:px-0">
      <CompanyDailyNormForm
        initialMinutes={company?.daily_norm_minutes ?? DEFAULT_DAILY_NORM_MINUTES}
      />

      <WorkCategoriesManager companyId={profile.company_id} initialCategories={categories} />
    </div>
  );
}
