"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { ReportsFeed } from "@/components/reports/ReportsFeed";
import { TeamTab } from "@/components/reports/TeamTab";
import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { t } from "@/lib/i18n";
import type { Profile } from "@/modules/auth/session";
import type { SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import type { Site } from "@/modules/sites/queries";
import { cn } from "@/lib/utils";

type ScreenTab = "mine" | "team";

const SCREEN_TAB_OPTIONS: readonly SegmentedOption<ScreenTab>[] = [
  { value: "mine", label: t.reports.screenTabs.mine },
  { value: "team", label: t.reports.screenTabs.team },
];

interface ReportsScreenProps {
  profile: Profile;
  reports: readonly SiteReportWithPhotos[];
  sites: readonly Site[];
  categories: readonly WorkCategory[];
  /** Подписанные ссылки первых фото: `storage_path` → URL, на час. */
  thumbUrls: Readonly<Record<string, string>>;
}

/**
 * Экран «Звіти». У boss дві вкладки нагорі — «Мої» (свои записи, як і
 * раніше) і «Команда» (REPORTS.md, розділ 4); у рядового робітника
 * вкладок нема, він завжди бачить тільки свою стрічку.
 */
export function ReportsScreen({ profile, reports, sites, categories, thumbUrls }: ReportsScreenProps) {
  const [tab, setTab] = useState<ScreenTab>("mine");
  const isBoss = profile.role === "boss";

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.reports.title}
        action={
          <Link
            href="/reports/new"
            aria-label={t.reports.createReport}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink",
              "transition-transform duration-150 active:scale-95",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            <Plus className="size-6" strokeWidth={2.6} aria-hidden />
          </Link>
        }
      />

      {isBoss && (
        <div className="px-4">
          <SegmentedTabs
            className="mb-3"
            options={SCREEN_TAB_OPTIONS}
            value={tab}
            onChange={setTab}
            label={t.reports.title}
          />
        </div>
      )}

      {isBoss && tab === "team" ? (
        <TeamTab companyId={profile.company_id} sites={sites} categories={categories} />
      ) : (
        <ReportsFeed reports={reports} sites={sites} categories={categories} thumbUrls={thumbUrls} />
      )}
    </div>
  );
}
