"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DeleteEntryButton } from "@/components/entries/DeleteEntryButton";
import { fmt, formatHoursShort, formatTimeShort, fromDateKey, pluralize } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { breakMinutes } from "@/modules/time/calc";
import { StampTag } from "@/components/ui/stamp-tag";
import { Ticket } from "@/components/ui/ticket";
import { TicketRow } from "@/components/ui/ticket-row";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

interface MonthEntriesTableProps {
  entries: readonly WorkEntryWithNames[];
  /** Шеф бачить, чия це зміна: у списку — зміни всієї компанії. */
  showAuthor: boolean;
  /** Викликається після успішного видалення — батько перезапитує дані. */
  onChanged: () => void;
  /** Записи відфільтровано — інший текст порожнього стану. */
  isFiltered?: boolean;
  /** Дані місяця ще вантажаться — замість порожнього стану скелетон. */
  isLoading?: boolean;
  /** Свой заголовок (например, «Зміни за день», когда в календаре выбран день). */
  title?: string;
  className?: string;
}

/**
 * «Зміни за місяць». Тонкі згорнуті рядки (дата, хто, час, години) — однаково
 * на телефоні й на ПК, без горизонтального скролу: список росте вниз. Дотик
 * розкриває об'єкт, перерву, опис і кнопки «Редагувати» / «Видалити». Що саме
 * потрапить у `entries` (свої зміни чи вся компанія), вирішує RLS на запиті
 * `getCompanyEntriesInRange`, тож редагування/видалення показуємо завжди:
 * `entries_update`/`entries_delete` дозволяють це для будь-якого рядка, який
 * тут узагалі можна побачити.
 */
export function MonthEntriesTable({
  entries,
  showAuthor,
  onChanged,
  isFiltered = false,
  isLoading = false,
  title,
  className,
}: MonthEntriesTableProps) {
  const t = useT();
  const locale = useLocale();
  const s = t.hoursUi;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Новий набір записів (інший місяць/фільтр) — знову з першої сторінки.
  const [prevEntries, setPrevEntries] = useState(entries);
  if (prevEntries !== entries && prevEntries.length !== entries.length) {
    setPrevEntries(entries);
    setVisibleCount(PAGE_SIZE);
  } else if (prevEntries !== entries) {
    setPrevEntries(entries);
  }

  const visibleEntries = entries.slice(0, visibleCount);
  const totalMinutes = entries.reduce((sum, entry) => sum + (entry.total_minutes ?? 0), 0);

  return (
    <Ticket asChild variant="flat"><section className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold whitespace-nowrap">{title ?? t.hours.monthTableTitle}</h2>
        {entries.length > 0 && (
          <p className="tabular shrink-0 text-[12px] text-ink-2 lg:text-[13px]">
            {fmt(s.entriesTotal, {
              total: `${formatHoursShort(totalMinutes)} ${t.units.hoursShort}`,
              n: pluralize(entries.length, locale, { one: s.shiftsOne, few: s.shiftsFew, many: s.shiftsMany }),
            })}
          </p>
        )}
      </div>

      {isLoading && entries.length === 0 ? (
        <div className="mt-3 space-y-2" aria-hidden>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-card" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink-2">
          {isFiltered ? s.emptyFilteredTitle : t.hours.monthTableEmpty}
        </p>
      ) : (
        <ul className="-mx-3.5 mt-3">
          {visibleEntries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} showAuthor={showAuthor} onChanged={onChanged} />
          ))}
        </ul>
      )}

      {entries.length > PAGE_SIZE && (
        <div className="flex flex-col items-center gap-2 pt-3">
          <p className="text-[12px] text-ink-2">
            {fmt(s.shownCount, { shown: visibleEntries.length, total: entries.length })}
          </p>
          {entries.length > visibleEntries.length && (
            <Button variant="outline" size="sm" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
              {s.loadMore}
            </Button>
          )}
        </div>
      )}
    </section></Ticket>
  );
}

function EntryRow({
  entry,
  showAuthor,
  onChanged,
}: {
  entry: WorkEntryWithNames;
  showAuthor: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const s = t.hoursUi;
  const pauseMinutes = breakMinutes(entry.break_start, entry.break_end);
  const isOngoing = entry.ended_at === null;
  const weekday = t.weekdays.short[fromDateKey(entry.work_date).getDay()];
  const description = entry.description?.trim();
  // Шеф бачить, чия це зміна; працівник — де він працював.
  const title = showAuthor ? entry.author_full_name : (entry.site_name ?? t.hours.noObject);

  return (
    <TicketRow
      summary={
        <>
          <span className="tabular w-[38px] shrink-0 text-[12px] text-ink-2">
            <span className="font-semibold text-text">{entry.work_date.slice(8, 10)}</span> {weekday}
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 font-semibold">
            <span className="truncate">{title}</span>
            {isOngoing && <StampTag>{t.hours.entryOngoing}</StampTag>}
          </span>
          <span className="tabular shrink-0 text-[13px] text-ink-2">
            {formatTimeShort(entry.started_at)}–{entry.ended_at ? formatTimeShort(entry.ended_at) : ""}
          </span>
          <span className="tabular w-[46px] shrink-0 text-right text-[15px] font-semibold">
            {entry.total_minutes !== null ? formatHoursShort(entry.total_minutes) : t.common.dash}
          </span>
        </>
      }
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-ink-2">{t.hours.monthTableObjectColumn}</dt>
        <dd className="min-w-0 break-words">{entry.site_name ?? t.hours.noObject}</dd>
        {pauseMinutes > 0 && (
          <>
            <dt className="text-ink-2">{t.hours.break}</dt>
            <dd className="tabular">{formatHoursShort(pauseMinutes)}</dd>
          </>
        )}
        {description && (
          <>
            <dt className="text-ink-2">{s.monthTableDescriptionColumn}</dt>
            <dd className="min-w-0 break-words">{description}</dd>
          </>
        )}
      </dl>

      {!isOngoing && (
        <div className="mt-3 grid grid-cols-2 gap-2 lg:max-w-sm">
          <Button asChild variant="outline" size="sm" block>
            <Link href={`/time/manual/${entry.id}`}>
              <Pencil className="size-4" strokeWidth={1.9} aria-hidden />
              {s.editShort}
            </Link>
          </Button>
          <DeleteEntryButton entryId={entry.id} onDeleted={onChanged} compact askAboutReport />
        </div>
      )}
    </TicketRow>
  );
}
