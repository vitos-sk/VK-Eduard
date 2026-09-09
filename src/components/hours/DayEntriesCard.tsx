import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { WorkEntry } from "@/modules/entries/types";
import { elapsedSecondsNow } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

interface DayEntriesCardProps {
  entries: readonly WorkEntry[];
  /** Имя объекта по `site_id`. */
  siteNameById: ReadonlyMap<string, string>;
  now: Date;
  className?: string;
}

/**
 * Список записей за день — то, из чего складывается сводка выше.
 * Не диаграмма: у ночной смены `ended_at` меньше `started_at` численно
 * (22:00 → 06:00), и рисовать это отрезком на шкале 00:00–24:00 значило бы
 * либо врать позицией, либо городить разворачивание через полночь ради
 * одной карточки. Текстовый диапазон времени показывает то же самое честно.
 */
export function DayEntriesCard({
  entries,
  siteNameById,
  now,
  className,
}: DayEntriesCardProps) {
  if (entries.length === 0) {
    return (
      <section
        className={cn(
          "rounded-[16px] border border-border bg-surface p-4",
          className,
        )}
      >
        <h2 className="text-[17px] font-bold">{t.hours.entriesTitle}</h2>
        <p className="mt-2 text-[14px] font-medium text-text-muted">
          {t.hours.noEntriesToday}
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-[16px] border border-border bg-surface p-4",
        className,
      )}
    >
      <h2 className="text-[17px] font-bold">{t.hours.entriesTitle}</h2>

      <ul className="mt-3 space-y-3">
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            siteName={
              entry.site_id
                ? (siteNameById.get(entry.site_id) ?? t.hours.noObject)
                : t.hours.noObject
            }
            now={now}
          />
        ))}
      </ul>
    </section>
  );
}

function EntryRow({
  entry,
  siteName,
  now,
}: {
  entry: WorkEntry;
  siteName: string;
  now: Date;
}) {
  const isOpen = entry.ended_at === null;
  const workedMinutes = isOpen
    ? Math.floor(
        elapsedSecondsNow(
          entry.work_date,
          entry.started_at,
          entry.break_start,
          entry.break_end,
          now,
        ) / 60,
      )
    : (entry.total_minutes ?? 0);

  return (
    <li className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-0 first:pt-0">
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold">{siteName}</p>
        <p className="tabular mt-0.5 text-[13px] font-medium text-text-muted">
          {entry.started_at} — {isOpen ? t.hours.entryOngoing : entry.ended_at}
          {entry.source === "manual" && ` · ${t.hours.entryManualBadge}`}
        </p>
      </div>

      <p className="tabular shrink-0 text-[15px] font-bold">
        {formatHoursShort(workedMinutes)}
      </p>
    </li>
  );
}
