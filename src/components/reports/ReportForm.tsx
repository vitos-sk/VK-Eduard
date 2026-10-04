"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DatePickLink, FormTopBar, PickerRow, StickyActionBar } from "@/components/shared/FormParts";
import { ReportPhotoUploader } from "@/components/reports/ReportPhotoUploader";
import { isOtherSelected, WorkCategoryChips } from "@/components/reports/WorkCategoryChips";
import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import { WorkTimeFields } from "@/components/time/WorkTimeFields";
import { Toggle } from "@/components/ui/toggle";
import { t } from "@/lib/i18n";
import { createReport } from "@/modules/reports/actions";
import type { ReportPhoto, SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import type { Site } from "@/modules/sites/queries";
import {
  dateKeyOf,
  isDurationValid,
  minutesToTime,
  timeToMinutes,
  totalMinutes,
} from "@/modules/time/calc";
import { Button } from "@/components/ui/button";
import { Ticket, TicketSection } from "@/components/ui/ticket";
import { UnderlineTextarea } from "@/components/ui/underline-field";

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
  const [otherText, setOtherText] = useState("");
  const [description, setDescription] = useState("");
  const [withTime, setWithTime] = useState(false);
  const [startAt, setStartAt] = useState("07:00");
  const [endAt, setEndAt] = useState("16:00");
  const [breakMin, setBreakMin] = useState(0);
  const [isObjectPickerOpen, setIsObjectPickerOpen] = useState(false);

  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Перерва завжди одразу після початку зміни — так само, як на екрані «Додати час».
  const breakStart = breakMin > 0 ? startAt : null;
  const breakEnd = breakMin > 0 ? minutesToTime(timeToMinutes(startAt) + breakMin) : null;
  const durationMin = totalMinutes(startAt, endAt, breakStart, breakEnd) ?? 0;
  const isDurationOk = isDurationValid(durationMin);
  const isOtherMissing = isOtherSelected(categories, categoryIds) && otherText.trim() === "";
  const canSubmit = (!withTime || isDurationOk) && !isOtherMissing;
  const submitLabel = isOtherMissing
    ? t.reportForm.fillOther
    : withTime && !isDurationOk
      ? t.reportForm.fixTime
      : t.reportForm.submit;

  const selectedSite = siteId ? sites.find((site) => site.id === siteId) : undefined;

  const applyRepeatLast = () => {
    if (!lastReport) return;

    setSiteId(lastReport.site_id);
    setCategoryIds(lastReport.category_ids);
    setOtherText(lastReport.other_text);
    // Описание намеренно не копируем — REPORTS.md: «описание чистое».
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await createReport({
        workDate: dateKeyOf(date),
        siteId,
        description,
        categoryIds,
        otherText,
        time: withTime ? { startedAt: startAt, endedAt: endAt, breakStart, breakEnd } : null,
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
        <FormTopBar title={t.reportForm.photosStepTitle} onBack={() => router.push(`/reports/${createdReportId}`)}>
          <p className="mt-0.5 text-[13px] text-ink-2">{t.reportForm.photosStepHint}</p>
        </FormTopBar>

        <div className="mt-4 space-y-4 px-4 lg:mx-auto lg:max-w-[640px] lg:px-0">
          <ReportPhotoUploader
            companyId={companyId}
            reportId={createdReportId}
            photos={photos}
            urls={photoUrls}
            onPhotosChange={setPhotos}
            onUrlsChange={(patch) => setPhotoUrls((current) => ({ ...current, ...patch }))}
            editable
          />
        </div>

        <StickyActionBar>
          <Button block onClick={() => router.push(`/reports/${createdReportId}`)}>
            {t.reportForm.done}
          </Button>
        </StickyActionBar>
      </div>
    );
  }

  return (
    <div className="pb-2 lg:mx-auto lg:max-w-[640px]">
      <FormTopBar
        title={t.reportForm.title}
        onBack={() => router.back()}
        action={
          lastReport ? (
            <Button variant="ghost" size="sm" className="-mr-2 px-2" onClick={applyRepeatLast}>
              {t.reportForm.repeatYesterday}
            </Button>
          ) : null
        }
      >
        <DatePickLink date={date} onChange={setDate} />
      </FormTopBar>

      <div className="mt-3 space-y-3.5 px-4 lg:px-0">
        <Ticket variant="sections">
          <PickerRow
            label={t.manualTime.objectLabel}
            value={selectedSite?.name ?? null}
            placeholder={t.manualTime.objectPlaceholder}
            onClick={() => setIsObjectPickerOpen(true)}
          />

          {categories.length > 0 && (
            <TicketSection>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[12px] text-ink-2">{t.reportForm.categoriesLabel}</span>
                <span className="text-[12px] text-ink-2">{t.reportForm.categoriesHint}</span>
              </div>
              <WorkCategoryChips
                categories={categories}
                value={categoryIds}
                onChange={setCategoryIds}
                otherText={otherText}
                onOtherTextChange={setOtherText}
              />
            </TicketSection>
          )}

          <TicketSection>
            <UnderlineTextarea
              label={t.manualTime.description}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder={t.manualTime.descriptionPlaceholder}
            />
          </TicketSection>
        </Ticket>

        <Ticket variant="sections">
          <label className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5">
            <span className="text-[14px] font-medium">{t.reportForm.addHours}</span>
            <Toggle checked={withTime} onCheckedChange={setWithTime} />
          </label>

          {withTime && (
            <WorkTimeFields
              className="perf-t"
              startAt={startAt}
              endAt={endAt}
              breakMin={breakMin}
              onStartChange={setStartAt}
              onEndChange={setEndAt}
              onBreakChange={setBreakMin}
              durationMin={durationMin}
              isDurationOk={isDurationOk}
            />
          )}
        </Ticket>
      </div>

      <StickyActionBar>
        <Button block onClick={handleSubmit} disabled={!canSubmit} loading={isPending}>
          {submitLabel}
        </Button>
      </StickyActionBar>

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
