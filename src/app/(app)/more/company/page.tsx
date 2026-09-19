import { redirect } from "next/navigation";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { CompanyDailyNormForm } from "@/components/more/company/CompanyDailyNormForm";
import { WorkCategoriesManager } from "@/components/more/company/WorkCategoriesManager";
import { companyStrings } from "@/lib/i18n/parts/company";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompany } from "@/modules/company/queries";
import { getAllWorkCategoriesForAdmin } from "@/modules/reports/queries";

const DEFAULT_DAILY_NORM_MINUTES = 480;

/** Компанія — тільки boss: денна норма за замовчуванням і категорії робіт. */
export default async function CompanyPage() {
  const profile = await requireProfile();

  if (profile.role !== "boss") {
    redirect("/more");
  }

  const supabase = await createClient();
  const [company, categories] = await Promise.all([
    getCompany(supabase, profile.company_id),
    getAllWorkCategoriesForAdmin(supabase, profile.company_id),
  ]);

  return (
    <div className="pb-6">
      <BackHeader title={companyStrings.title} href="/more" />

      <div className="flex flex-col gap-4 px-4 lg:mx-auto lg:max-w-[720px]">
        <CompanyDailyNormForm
          initialMinutes={company?.daily_norm_minutes ?? DEFAULT_DAILY_NORM_MINUTES}
        />

        <WorkCategoriesManager companyId={profile.company_id} initialCategories={categories} />
      </div>
    </div>
  );
}
