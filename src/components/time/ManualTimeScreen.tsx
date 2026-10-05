"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DatePickLink, FormTopBar, PickerRow, StickyActionBar } from "@/components/shared/FormParts";
import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import { WorkTimeFields } from "@/components/time/WorkTimeFields";
import { useT } from "@/lib/i18n/client";
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
import { Ticket, TicketSection } from "@/components/ui/ticket";
import { UnderlineTextarea } from "@/components/ui/underline-field";

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
  const t = useT();
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
  const submitLabel = !isDurationOk
    ? t.manualTime.fixTime
    : !hasSiteOrDescription
      ? t.manualTime.fillSiteOrDescription
      : entry
        ? t.manualTime.saveChanges
        : t.manualTime.submit;

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
    <div className="pb-2 lg:mx-auto lg:max-w-[640px]">
      <FormTopBar
        title={entry ? t.manualTime.editTitle : t.manualTime.title}
        onBack={() => router.back()}
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
        </Ticket>
      </div>

      <StickyActionBar>
        <Button block onClick={handleSubmit} disabled={!isValid} loading={isPending}>
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
