"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { uk as ukLocale } from "date-fns/locale";
import { CalendarDays, ChevronRight, History, Info } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { ReportPhotoUploader } from "@/components/reports/ReportPhotoUploader";
import { WorkCategoryChips } from "@/components/reports/WorkCategoryChips";
import { Thumb } from "@/components/shared/Thumb";
import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { gradientForId } from "@/lib/siteGradient";
import { createReport } from "@/modules/reports/actions";
import type { ReportPhoto, SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import type { Site } from "@/modules/sites/queries";
import { dateKeyOf } from "@/modules/time/calc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";

interface ReportFormProps {
  companyId: string;
  sites: readonly Site[];
  categories: readonly WorkCategory[];
  /** Самый свежий звіт автора — источник «останнього об'єкта» и повтора. */
  lastReport: SiteReportWithPhotos | null;
}

/**
 * Форма `/reports/new`. Два шага в одном экране: сперва об'єкт/дата/категорії/опис
 * сохраняются одной записью, потом (уже с готовым `reportId`) можно сразу
 * добавить фото — до этого их физически некуда прикреплять.
 */
export function ReportForm({ companyId, sites, categories, lastReport }: ReportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [siteId, setSiteId] = useState<string | null>(lastReport?.site_id ?? null);
  const [date, setDate] = useState<Date>(() => new Date());
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isObjectPickerOpen, setIsObjectPickerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const selectedSite = siteId ? sites.find((site) => site.id === siteId) : undefined;

  const applyRepeatLast = () => {
    if (!lastReport) return;

    setSiteId(lastReport.site_id);
    setCategoryIds(lastReport.category_ids);
    // Описание намеренно не копируем — REPORTS.md: «описание чистое».
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await createReport({
        workDate: dateKeyOf(date),
        siteId,
        description,
        categoryIds,
      });

      if (result.error || !result.reportId) {
        toast(result.error ?? t.reportForm.saveError);
        return;
      }

      toast(t.reportForm.saved);
      setCreatedReportId(result.reportId);
      router.refresh();
    });
  };

  if (createdReportId) {
    return (
      <div className="pb-6">
        <BackHeader title={t.reportForm.title} href={`/reports/${createdReportId}`} />

        <div className="space-y-4 px-4 lg:mx-auto lg:max-w-[640px]">
          <div>
            <h2 className="text-[17px] font-bold">{t.reportForm.photosStepTitle}</h2>
            <p className="mt-1 text-[13px] font-medium text-text-muted">
              {t.reportForm.photosStepHint}
            </p>
          </div>

          <ReportPhotoUploader
            companyId={companyId}
            reportId={createdReportId}
            photos={photos}
            urls={photoUrls}
            onPhotosChange={setPhotos}
            onUrlsChange={(patch) => setPhotoUrls((current) => ({ ...current, ...patch }))}
            editable
          />

          <Button size="xl" block onClick={() => router.push(`/reports/${createdReportId}`)}>
            {t.reportForm.done}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <BackHeader title={t.reportForm.title} onBack={() => router.back()} />

      <div className="space-y-6 px-4 lg:mx-auto lg:max-w-[640px]">
        {lastReport && (
          <Card asChild interactive className="flex w-full items-center gap-3">
          <button type="button" onClick={applyRepeatLast}>
            <History className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
            <span className="text-[14px] font-bold text-text">
              {t.reportForm.repeatYesterday}
            </span>
          </button>
          </Card>
        )}

        <Field label={t.manualTime.objectLabel}>
          <Card asChild padding="sm" interactive className="flex min-h-[68px] w-full items-center gap-3">
          <button type="button" onClick={() => setIsObjectPickerOpen(true)}>
            {selectedSite ? (
              <>
                <Thumb name={selectedSite.name} gradient={gradientForId(selectedSite.id)} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">
                    {selectedSite.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] font-medium text-text-muted">
                    {selectedSite.address ?? t.common.dash}
                  </span>
                </span>
              </>
            ) : (
              <span className="min-w-0 flex-1 px-1 text-[15px] font-medium text-text-muted">
                {t.manualTime.objectPlaceholder}
              </span>
            )}

            <ChevronRight className="size-5 shrink-0 text-text-dim" strokeWidth={2.4} aria-hidden />
          </button>
          </Card>
        </Field>

        <Field label={t.manualTime.date}>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="field" size="field" className="gap-2 px-3 text-[15px]">
                <CalendarDays className="size-5 shrink-0 text-text-muted" strokeWidth={2} aria-hidden />
                <span className="tabular truncate">{formatDateShort(date)}</span>
              </Button>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-auto border border-border bg-surface p-2">
              <Calendar
                mode="single"
                selected={date}
                defaultMonth={date}
                onSelect={(next) => {
                  if (next) {
                    setDate(next);
                    setIsCalendarOpen(false);
                  }
                }}
                locale={ukLocale}
              />
            </PopoverContent>
          </Popover>
        </Field>

        {categories.length > 0 && (
          <Field label={t.reportForm.categoriesLabel}>
            <WorkCategoryChips categories={categories} value={categoryIds} onChange={setCategoryIds} />
          </Field>
        )}

        <Field label={t.manualTime.description}>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder={t.manualTime.descriptionPlaceholder}
          />
        </Field>

        <p className="flex items-start gap-3 rounded-[16px] border border-border bg-surface p-4 text-[13px] leading-[1.4] font-medium text-text-muted">
          <Info className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
          {t.reportForm.hint}
        </p>

        <Button size="xl" block onClick={handleSubmit} disabled={isPending}>
          {t.reportForm.submit}
        </Button>
      </div>

      <ObjectPickerDrawer
        open={isObjectPickerOpen}
        onOpenChange={setIsObjectPickerOpen}
        sites={sites}
        value={siteId}
        onSelect={setSiteId}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-text-muted">{label}</p>
      {children}
    </div>
  );
}
