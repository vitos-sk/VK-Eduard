"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { updateEntry } from "@/modules/entries/actions";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import type { Site } from "@/modules/sites/queries";
import {
  breakMinutes as calcBreakMinutes,
  minutesToTime,
  timeToMinutes,
  totalMinutes,
} from "@/modules/time/calc";
import { cn } from "@/lib/utils";

const NO_SITE = "__none__";
/** Ті самі кроки, що й у мобільній формі `ManualTimeScreen` — звична крупність перерви. */
const BREAK_OPTIONS_MIN = [0, 15, 30, 45, 60] as const;

const fieldClassName = cn(
  "h-10 w-full rounded-[10px] border border-border bg-surface-2 px-3",
  "text-[14px] font-bold text-text placeholder:text-text-dim placeholder:font-medium",
  "outline-none focus-visible:border-brand",
);

const selectTriggerClassName = cn(
  "h-10 w-full rounded-[10px] border-border bg-surface-2 px-3",
  "text-[14px] font-bold text-text",
  "focus-visible:border-border focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
);

interface EntryEditDialogProps {
  /** `null` — діалог закритий. */
  entry: WorkEntryWithNames | null;
  sites: readonly Site[];
  onOpenChange: (open: boolean) => void;
  /** Викликається після успішного збереження. */
  onSaved: () => void;
}

/**
 * Компактне редагування запису для адмінки — той самий `updateEntry`,
 * що й мобільна `ManualTimeScreen`, але в модалці замість повноекранної
 * форми: шефу на десктопі не треба переходити на інший маршрут заради
 * одного поля.
 *
 * Форма винесена в окремий `EntryEditForm`, змонтований з `key={entry.id}`:
 * так стан полів ініціалізується прямо з запису при відкритті нового рядка,
 * без `useEffect`, що синхронізує state (React не рекомендує так робити —
 * зайвий проміжний рендер).
 */
export function EntryEditDialog({ entry, sites, onOpenChange, onSaved }: EntryEditDialogProps) {
  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t.admin.entries.editTitle}</DialogTitle>
        </DialogHeader>

        {entry && (
          <EntryEditForm
            key={entry.id}
            entry={entry}
            sites={sites}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface EntryEditFormProps {
  entry: WorkEntryWithNames;
  sites: readonly Site[];
  onCancel: () => void;
  onSaved: () => void;
}

function EntryEditForm({ entry, sites, onCancel, onSaved }: EntryEditFormProps) {
  const [isPending, startTransition] = useTransition();

  const [siteId, setSiteId] = useState<string | null>(entry.site_id);
  const [workDate, setWorkDate] = useState(entry.work_date);
  const [startAt, setStartAt] = useState(entry.started_at.slice(0, 5));
  const [endAt, setEndAt] = useState(entry.ended_at?.slice(0, 5) ?? "");
  const [breakMin, setBreakMin] = useState(() =>
    calcBreakMinutes(entry.break_start, entry.break_end),
  );
  const [description, setDescription] = useState(entry.description);
  const [error, setError] = useState<string | null>(null);

  // Перерва завжди одразу після початку зміни — той самий підхід, що й у
  // мобільній `ManualTimeScreen`.
  const breakStart = breakMin > 0 ? startAt : null;
  const breakEnd = breakMin > 0 ? minutesToTime(timeToMinutes(startAt) + breakMin) : null;
  const durationMin = startAt && endAt ? (totalMinutes(startAt, endAt, breakStart, breakEnd) ?? 0) : 0;
  const hasSiteOrDescription = siteId !== null || description.trim() !== "";

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const result = await updateEntry(entry.id, {
        workDate,
        siteId,
        startedAt: startAt,
        endedAt: endAt,
        breakStart,
        breakEnd,
        description,
      });

      if (result.error) {
        setError(result.error);
        toast(result.error);
        return;
      }

      toast(t.manualTime.updated);
      onSaved();
    });
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <Field label={t.admin.entries.editSiteLabel}>
          <Select
            value={siteId ?? NO_SITE}
            onValueChange={(value) => setSiteId(value === NO_SITE ? null : value)}
          >
            <SelectTrigger className={selectTriggerClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SITE}>{t.admin.entries.editSitePlaceholder}</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t.admin.entries.editDateLabel}>
          <input
            type="date"
            value={workDate}
            onChange={(event) => setWorkDate(event.target.value)}
            className={cn(fieldClassName, "tabular")}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.admin.entries.editStartLabel}>
            <input
              type="time"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              className={cn(fieldClassName, "tabular")}
            />
          </Field>

          <Field label={t.admin.entries.editEndLabel}>
            <input
              type="time"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              className={cn(fieldClassName, "tabular")}
            />
          </Field>
        </div>

        <Field label={t.admin.entries.editBreakLabel}>
          <div className="flex flex-wrap gap-2">
            {BREAK_OPTIONS_MIN.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setBreakMin(minutes)}
                aria-pressed={breakMin === minutes}
                className={cn(
                  "flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-bold",
                  "transition-colors duration-150",
                  breakMin === minutes
                    ? "border-brand bg-brand text-brand-ink"
                    : "border-border bg-surface-2 text-text hover:bg-surface",
                )}
              >
                {minutes === 0 ? t.common.dash : formatHoursShort(minutes)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t.admin.entries.editDescriptionLabel}>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder={t.manualTime.descriptionPlaceholder}
            className={cn(
              "w-full resize-none rounded-[10px] border border-border bg-surface-2 p-3",
              "text-[14px] leading-[1.4] font-medium text-text placeholder:text-text-dim",
              "outline-none focus-visible:border-brand",
            )}
          />
        </Field>

        {error && <p className="text-[13px] font-medium text-danger">{error}</p>}
      </div>

      <DialogFooter className="flex-row justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 items-center justify-center rounded-[10px] border border-border px-4 text-[14px] font-bold text-text transition-transform duration-150 active:scale-[0.98]"
        >
          {t.common.cancel}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !durationMin || !hasSiteOrDescription}
          className={cn(
            "flex h-10 items-center justify-center rounded-[10px] bg-brand px-4",
            "text-[14px] font-bold text-brand-ink",
            "transition-transform duration-150 active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          {t.common.save}
        </button>
      </DialogFooter>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold text-text-muted">{label}</p>
      {children}
    </div>
  );
}
