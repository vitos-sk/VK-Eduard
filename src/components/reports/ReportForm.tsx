"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { uk as ukLocale } from "date-fns/locale";
import { CalendarDays, ChevronRight, Clock, History, Info } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { PhotoUploader } from "@/components/reports/PhotoUploader";
import { Thumb } from "@/components/shared/Thumb";
import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { formatDateShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { gradientForId } from "@/lib/siteGradient";
import { createManualEntry } from "@/modules/entries/actions";
import type { WorkEntryWithPhotos } from "@/modules/entries/types";
import type { EntryPhoto } from "@/modules/media/photos";
import type { Site } from "@/modules/sites/queries";
import {
  dateKeyOf,
  isDurationValid,
  minutesBetweenWrapped,
  minutesToTime,
  timeToMinutes,
} from "@/modules/time/calc";
import { cn } from "@/lib/utils";

const DEFAULT_START = "08:00";
/** Быстрые кнопки конца смены от начала — REPORTS.md, раздел 6. */
const QUICK_DURATIONS_H = [8, 10] as const;
/** Перерыв по умолчанию 1:00 включается с середины типовой смены. */
const BREAK_OFFSET_MIN = 4 * 60;
const BREAK_LENGTH_MIN = 60;

interface ReportFormProps {
  companyId: string;
  sites: readonly Site[];
  /** Самая свежая запись автора — источник «останнього об'єкта» и повтора. */
  lastEntry: WorkEntryWithPhotos | null;
}

/**
 * Форма `/reports/new`. Два шага в одном экране: сперва час/об'єкт/опис
 * сохраняются одной записью, потом (уже с готовым `entryId`) можно сразу
 * добавить фото — до этого их физически некуда прикреплять.
 */
export function ReportForm({ companyId, sites, lastEntry }: ReportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [siteId, setSiteId] = useState<string | null>(lastEntry?.site_id ?? null);
  const [date, setDate] = useState<Date>(() => new Date());
  const [startAt, setStartAt] = useState(DEFAULT_START);
  const [endAt, setEndAt] = useState("");
  const [breakEnabled, setBreakEnabled] = useState(false);
  const [description, setDescription] = useState("");
  const [isObjectPickerOpen, setIsObjectPickerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [createdEntryId, setCreatedEntryId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<EntryPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const selectedSite = siteId ? sites.find((site) => site.id === siteId) : undefined;

  const breakStart = breakEnabled ? minutesToTime(timeToMinutes(startAt) + BREAK_OFFSET_MIN) : null;
  const breakEnd = breakEnabled
    ? minutesToTime(timeToMinutes(startAt) + BREAK_OFFSET_MIN + BREAK_LENGTH_MIN)
    : null;

  const durationMin =
    endAt === ""
      ? 0
      : minutesBetweenWrapped(startAt, endAt) -
        (breakStart && breakEnd ? minutesBetweenWrapped(breakStart, breakEnd) : 0);
  const isValid = endAt !== "" && isDurationValid(durationMin);

  const applyQuickDuration = (hours: number) => {
    setEndAt(minutesToTime(timeToMinutes(startAt) + hours * 60));
  };

  const applyRepeatLast = () => {
    if (!lastEntry) return;

    setSiteId(lastEntry.site_id);
    setStartAt(lastEntry.started_at.slice(0, 5));
    if (lastEntry.ended_at) setEndAt(lastEntry.ended_at.slice(0, 5));
    setBreakEnabled(lastEntry.break_start !== null);
    // Описание намеренно не копируем — REPORTS.md: «описание чистое».
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await createManualEntry({
        workDate: dateKeyOf(date),
        siteId,
        startedAt: startAt,
        endedAt: endAt,
        breakStart,
        breakEnd,
        description,
      });

      if (result.error || !result.entryId) {
        toast(result.error ?? t.manualTime.saveError);
        return;
      }

      toast(t.reportForm.saved);
      setCreatedEntryId(result.entryId);
      router.refresh();
    });
  };

  if (createdEntryId) {
    return (
      <div className="pb-6">
        <BackHeader title={t.reportForm.title} href={`/reports/${createdEntryId}`} />

        <div className="space-y-4 px-4">
          <div>
            <h2 className="text-[17px] font-bold">{t.reportForm.photosStepTitle}</h2>
            <p className="mt-1 text-[13px] font-medium text-text-muted">
              {t.reportForm.photosStepHint}
            </p>
          </div>

          <PhotoUploader
            companyId={companyId}
            entryId={createdEntryId}
            photos={photos}
            urls={photoUrls}
            onPhotosChange={setPhotos}
            onUrlsChange={(patch) => setPhotoUrls((current) => ({ ...current, ...patch }))}
            editable
          />

          <button
            type="button"
            onClick={() => router.push(`/reports/${createdEntryId}`)}
            className={cn(
              "flex h-[56px] w-full items-center justify-center rounded-[14px]",
              "bg-brand text-[15px] font-bold text-brand-ink",
              "transition-transform duration-150 active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            {t.reportForm.done}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <BackHeader title={t.reportForm.title} onBack={() => router.back()} />

      <div className="space-y-6 px-4">
        {lastEntry && (
          <button
            type="button"
            onClick={applyRepeatLast}
            className={cn(
              "flex w-full items-center gap-3 rounded-[16px] border border-border bg-surface p-4 text-left",
              "transition-transform duration-150 active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            <History className="size-5 shrink-0 text-brand" strokeWidth={2} aria-hidden />
            <span className="text-[14px] font-bold text-text">
              {t.reportForm.repeatYesterday}
            </span>
          </button>
        )}

        <Field label={t.manualTime.objectLabel}>
          <button
            type="button"
            onClick={() => setIsObjectPickerOpen(true)}
            className={cn(
              "flex min-h-[68px] w-full items-center gap-3 rounded-[16px] border border-border bg-surface p-3 text-left",
              "transition-transform duration-150 active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
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
        </Field>

        <Field label={t.manualTime.date}>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex h-[52px] w-full items-center gap-2 rounded-[14px] px-3",
                  "border border-border bg-surface text-[15px] font-bold text-text",
                  "transition-transform duration-150 active:scale-[0.98]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                )}
              >
                <CalendarDays className="size-5 shrink-0 text-text-muted" strokeWidth={2} aria-hidden />
                <span className="tabular truncate">{formatDateShort(date)}</span>
              </button>
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

        <div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.manualTime.start}>
              <TimeInput value={startAt} onChange={setStartAt} invalid={false} />
            </Field>

            <Field label={t.manualTime.finish}>
              <TimeInput value={endAt} onChange={setEndAt} invalid={endAt !== "" && !isValid} />
            </Field>
          </div>

          <div className="mt-2 flex gap-2">
            {QUICK_DURATIONS_H.map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => applyQuickDuration(hours)}
                className="flex h-9 items-center gap-1 rounded-full border border-border bg-surface-2 px-3 text-[13px] font-bold text-text active:scale-95"
              >
                <Clock className="size-3.5" strokeWidth={2.2} aria-hidden />
                {`${hours} ${t.units.hoursShort}`}
              </button>
            ))}
          </div>

          {endAt !== "" && !isValid && (
            <p className="mt-2 text-[13px] font-medium text-danger">
              {t.manualTime.errorDuration}
            </p>
          )}
        </div>

        <label className="flex min-h-[60px] w-full items-center gap-3 rounded-[16px] border border-border bg-surface p-4">
          <span className="min-w-0 flex-1 text-[15px] font-medium text-text">
            {t.reportForm.breakToggle}
          </span>
          <Switch
            checked={breakEnabled}
            onCheckedChange={setBreakEnabled}
            className="h-6 w-11 [&>[data-slot=switch-thumb]]:size-5"
          />
        </label>

        <Field label={t.manualTime.description}>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder={t.manualTime.descriptionPlaceholder}
            className={cn(
              "w-full resize-none rounded-[16px] border border-border bg-surface p-4",
              "text-[15px] leading-[1.4] font-medium text-text placeholder:text-text-dim",
              "outline-none focus-visible:border-brand",
            )}
          />
        </Field>

        <p className="flex items-start gap-3 rounded-[16px] border border-border bg-surface p-4 text-[13px] leading-[1.4] font-medium text-text-muted">
          <Info className="size-5 shrink-0 text-brand" strokeWidth={2} aria-hidden />
          {t.manualTime.hint}
        </p>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || isPending}
          className={cn(
            "flex h-[56px] w-full items-center justify-center rounded-[14px]",
            "bg-brand text-[15px] font-bold text-brand-ink",
            "transition-transform duration-150 active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-40",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          {t.reportForm.submit}
        </button>
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

function TimeInput({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <input
      type="time"
      value={value}
      aria-invalid={invalid}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "tabular h-[52px] w-full rounded-[14px] border bg-surface px-3",
        "text-[15px] font-bold text-text outline-none",
        "[&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:invert",
        invalid ? "border-danger" : "border-border focus-visible:border-brand",
      )}
    />
  );
}
