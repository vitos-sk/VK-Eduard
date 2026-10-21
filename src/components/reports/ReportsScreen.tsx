"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { AvatarLink } from "@/components/layout/AvatarLink";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { ReportsFeed } from "@/components/reports/ReportsFeed";
import { TeamTab } from "@/components/reports/TeamTab";
import { useT } from "@/lib/i18n/client";
import { initialsOf } from "@/components/shared/Thumb";
import type { Profile } from "@/modules/auth/profile";
import type { SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import type { Site } from "@/modules/sites/queries";
import { Button } from "@/components/ui/button";

interface ReportsScreenProps {
  profile: Profile;
  reports: readonly SiteReportWithPhotos[];
  sites: readonly Site[];
  categories: readonly WorkCategory[];
  /** Подписанные ссылки первых фото: `storage_path` → URL, на час. */
  thumbUrls: Readonly<Record<string, string>>;
}

/**
 * Экран «Звіти». Шеф сразу видит команду (REPORTS.md, розділ 4): его собственные
 * отчёты там же — в общей ленте и в списке «Люди». Рядовой робітник видит
 * только свою стрічку. Переключателей «Мої / Команда» нет.
 */
export function ReportsScreen({ profile, reports, sites, categories, thumbUrls }: ReportsScreenProps) {
  const t = useT();
  const isBoss = profile.role === "boss";

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.reports.title}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="primary" size="sm" aria-label={t.reports.createReport}>
              <Link href="/reports/new">
                {/* На узком экране значок уступает место подписи: перевод бывает длинным. */}
                <Plus className="size-4 max-[369px]:hidden" strokeWidth={2} aria-hidden />
                {t.reports.addReport}
              </Link>
            </Button>
            <AvatarLink initials={initialsOf(profile.full_name)} className="hidden lg:block" />
          </div>
        }
      />

      {isBoss ? (
        <TeamTab companyId={profile.company_id} sites={sites} categories={categories} />
      ) : (
        <ReportsFeed reports={reports} sites={sites} categories={categories} thumbUrls={thumbUrls} />
      )}
    </div>
  );
}
