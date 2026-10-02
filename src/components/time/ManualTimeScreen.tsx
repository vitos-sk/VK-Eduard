"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { uk as ukLocale } from "date-fns/locale";
import { CalendarDays, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { Thumb } from "@/components/shared/Thumb";
import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import { FieldLabel, WorkTimeFields } from "@/components/time/WorkTimeFields";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { gradientForId } from "@/lib/siteGradient";
import { createManualEntry, updateEntry } from "@/modules/entries/actions";
import type { WorkEntry } from "@/modules/entries/types";
import type { Site } from "@/modules/sites/queries";
import {
  breakMinutes as calcBreakMinutes,
  isDurationValid,
  minutesToTime,
  timeToMinutes,
  totalMinutes,
  dateKeyOf,
} from "@/modules/time/calc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";

/** Значения по умолчанию — те же, что на макете. */
const DEFAULT_START = "07:00";
const DEFAULT_END = "16:00";

interface ManualTimeScreenProps {
  sites: readonly Site[];
  /** Задано — режим редагування наявного запису замість створення нового. */
  entry?: WorkEntry;
}

/**
 * Екран «Додати час вручну» (і, коли передано `entry`, редагування
 * наявного запису) — форма пише закриту запис прямо в базу.
 *
 * Перерва вводиться кнопками або числом хвилин і завжди ставиться
 * одразу після «Початок» (breakStart = startAt). В режимі редагування
 * початковий вибір рахується з наявних break_start/break_end запису, тож
 * нічого тихо не затирається, поки користувач не змінить кнопку сам.
 */
export function ManualTimeScreen({ sites, entry }: ManualTimeScreenProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [siteId, setSiteId] = useState<string | null>(entry?.site_id ?? null);
  const [date, setDate] = useState<Date>(() =>
    entry ? new Date(`${entry.work_date}T00:00:00`) : new Date(),
  );
  const [startAt, setStartAt] = useState(entry?.started_at.slice(0, 5) ?? DEFAULT_START);
  const [endAt, setEndAt] = useState(entry?.ended_at?.slice(0, 5) ?? DEFAULT_END);
  const [breakMin, setBreakMin] = useState(() =>
    calcBreakMinutes(entry?.break_start ?? null, entry?.break_end ?? null),
  );
  const [description, setDescription] = useState(entry?.description ?? "");
  const [isObjectPickerOpen, setIsObjectPickerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const selectedSite = siteId ? sites.find((site) => site.id === siteId) : undefined;

  // Перерва завжди одразу після початку зміни — просто і предсказувано.
  const breakStart = breakMin > 0 ? startAt : null;
  const breakEnd = breakMin > 0 ? minutesToTime(timeToMinutes(startAt) + breakMin) : null;

  // Переход через полночь — не ошибка: 22:00 → 06:00 это нічна зміна
  // (docs/DATA-MODEL.md), поэтому длительность считаем «завёрнутой».
  const durationMin = totalMinutes(startAt, endAt, breakStart, breakEnd) ?? 0;
  const isDurationOk = isDurationValid(durationMin);

  // Запись должна быть привязана хоть к чему-то: если не выбран объект,
  // без описания непонятно, где вообще отработаны эти часы.
  const hasSiteOrDescription = siteId !== null || description.trim() !== "";
  const isValid = isDurationOk && hasSiteOrDescription;

  const handleSubmit = () => {
    startTransition(async () => {
      const input = {
        workDate: dateKeyOf(date),
        siteId,
        startedAt: startAt,
        endedAt: endAt,
        breakStart,
        breakEnd,
        description,
      };

      const result = entry
        ? await updateEntry(entry.id, input)
        : await createManualEntry(input);

      if (result.error) {
        toast(result.error);
        return;
      }

      toast(entry ? t.manualTime.updated : t.manualTime.saved);
      router.push("/hours");
      router.refresh();
    });
  };

  return (
    <div className="pb-6">
      <BackHeader
        title={entry ? t.manualTime.editTitle : t.manualTime.title}
        onBack={() => router.back()}
      />

      <div className="space-y-6 px-4 lg:mx-auto lg:max-w-[640px]">
        {!entry && (
          <p className="flex items-start gap-3 rounded-[16px] border border-border bg-surface p-4 text-[13px] leading-[1.4] font-medium text-text-muted">
            <Info className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
            {t.manualTime.hint}
          </p>
        )}

        <Field label={t.manualTime.objectLabel}>
          <Card asChild padding="sm" interactive className="flex min-h-[68px] w-full items-center gap-3">
          <button type="button" onClick={() => setIsObjectPickerOpen(true)}>
            {selectedSite ? (
              <>
                <Thumb
                  name={selectedSite.name}
                  gradient={gradientForId(selectedSite.id)}
                  size="sm"
                />
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

            <ChevronRight
              className="size-5 shrink-0 text-text-dim"
              strokeWidth={2.4}
              aria-hidden
            />
          </button>
          </Card>
        </Field>

        <Field label={t.manualTime.date}>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="field" size="field" className="gap-2 px-3 text-[15px]">
                <CalendarDays
                  className="size-5 shrink-0 text-text-muted"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="tabular truncate">
                  {formatDateShort(date)}
                </span>
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              className="w-auto border border-border bg-surface p-2"
            >
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

        <WorkTimeFields
          startAt={startAt}
          endAt={endAt}
          breakMin={breakMin}
          onStartChange={setStartAt}
          onEndChange={setEndAt}
          onBreakChange={setBreakMin}
          durationMin={durationMin}
          isDurationOk={isDurationOk}
        />

        <div>
          <Field label={t.manualTime.description}>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder={t.manualTime.descriptionPlaceholder}
            />
          </Field>

          {!hasSiteOrDescription && (
            <p className="mt-2 text-[13px] font-medium text-text-muted">
              {t.manualTime.errorSiteOrDescription}
            </p>
          )}
        </div>

        <Button size="xl" block onClick={handleSubmit} disabled={!isValid || isPending}>
          {entry ? t.manualTime.saveChanges : t.manualTime.submit}
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
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}
