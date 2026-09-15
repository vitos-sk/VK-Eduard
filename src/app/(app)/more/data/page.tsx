import { BackHeader } from "@/components/layout/ScreenHeader";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { t } from "@/lib/i18n";
import { requireProfile } from "@/modules/auth/session";

/** Експорт власних годин за весь час — від дати реєстрації до сьогодні. */
export default async function DataManagementPage() {
  const profile = await requireProfile();

  const from = profile.created_at.slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);

  return (
    <div className="pb-6">
      <BackHeader title={t.profile.dataPage.title} href="/more" />

      <div className="flex flex-col gap-4 px-4 lg:mx-auto lg:max-w-[480px]">
        <p className="text-[15px] leading-relaxed font-medium text-text-muted">
          {t.profile.dataPage.body}
        </p>

        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-surface-2 p-4">
          <span className="text-[15px] font-bold">{t.profile.dataPage.exportLabel}</span>
          <ExportMenu from={from} to={to} kind="hours" />
        </div>
      </div>
    </div>
  );
}
