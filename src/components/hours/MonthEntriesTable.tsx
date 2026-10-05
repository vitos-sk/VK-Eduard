"use client";

import Link from "next/link";
import { Pause, Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DeleteEntryButton } from "@/components/entries/DeleteEntryButton";
import { fmt, formatHoursShort, formatTimeShort, formatWorkDateShort } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { breakMinutes } from "@/modules/time/calc";
import { StampTag } from "@/components/ui/stamp-tag";
import { Ticket, TicketBody, TicketStub } from "@/components/ui/ticket";
import {
  TicketTable,
  TicketTableCell,
  TicketTableHead,
  TicketTableHeader,
  TicketTableRow,
} from "@/components/ui/ticket-table";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

/**
 * Самописний горизонтальний повзунок для таблиці «Зміни за місяць».
 * Нативний скролбар на мобілці або прихований, або зникає одразу після
 * жеста — користувач не бачить, що рядок можна проскролити вбік. Цей
 * повзунок завжди видимий і синхронізований зі скролом таблиці в обидва
 * боки: свайп по таблиці рухає повзунок, перетягування повзунка скролить
 * таблицю.
 */
function useHorizontalScrollThumb(scrollRef: React.RefObject<HTMLDivElement | null>) {
  const [thumb, setThumb] = useState({ widthPct: 100, leftPct: 0, visible: false });

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth + 1) {
      setThumb({ widthPct: 100, leftPct: 0, visible: false });
      return;
    }
    const widthPct = Math.max((clientWidth / scrollWidth) * 100, 12);
    const maxLeftPct = 100 - widthPct;
    const leftPct = (scrollLeft / (scrollWidth - clientWidth)) * maxLeftPct;
    setThumb({ widthPct, leftPct, visible: true });
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    measure();

    el.addEventListener("scroll", measure, { passive: true });
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);
    if (el.firstElementChild) resizeObserver.observe(el.firstElementChild);

    return () => {
      el.removeEventListener("scroll", measure);
      resizeObserver.disconnect();
    };
  }, [measure, scrollRef]);

  const scrollToLeftPct = useCallback(
    (leftPct: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const { scrollWidth, clientWidth } = el;
      const widthPct = Math.max((clientWidth / scrollWidth) * 100, 12);
      const maxLeftPct = 100 - widthPct;
      const clamped = Math.min(Math.max(leftPct, 0), maxLeftPct);
      el.scrollLeft = (clamped / maxLeftPct) * (scrollWidth - clientWidth);
    },
    [scrollRef],
  );

  return { thumb, scrollToLeftPct };
}

function HorizontalScrollbar({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const { thumb, scrollToLeftPct } = useHorizontalScrollThumb(scrollRef);
  const dragState = useRef<{ startX: number; startLeftPct: number } | null>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragState.current = { startX: event.clientX, startLeftPct: thumb.leftPct };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [thumb.leftPct],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current || !trackRef.current) return;
      const trackWidth = trackRef.current.clientWidth;
      if (trackWidth === 0) return;
      const deltaPct = ((event.clientX - dragState.current.startX) / trackWidth) * 100;
      scrollToLeftPct(dragState.current.startLeftPct + deltaPct);
    },
    [scrollToLeftPct],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  if (!thumb.visible) return null;

  return (
    <div
      ref={trackRef}
      className="relative mt-2 h-[6px] rounded-sm bg-scale"
      role="scrollbar"
      aria-orientation="horizontal"
      aria-label={t.hours.monthTableScrollHint}
      aria-controls="month-entries-scroll"
      aria-valuenow={Math.round(thumb.leftPct)}
      aria-valuemin={0}
      aria-valuemax={Math.round(100 - thumb.widthPct)}
    >
      <div
        className="absolute inset-y-0 touch-none rounded-sm bg-primary"
        style={{ width: `${thumb.widthPct}%`, left: `${thumb.leftPct}%` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}


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
  className?: string;
}

/**
 * «Зміни за місяць». На телефоні — список: одна зміна = один рядок (дата,
 * час, об'єкт, перерва, години, дії), без горизонтального скролу. Від `lg` —
 * таблиця з усіма колонками. Що саме потрапить у `entries` (свої зміни чи
 * вся компанія), вирішує RLS на запиті `getCompanyEntriesInRange`, тож
 * редагування/видалення показуємо завжди: `entries_update`/`entries_delete`
 * дозволяють це для будь-якого рядка, який тут узагалі можна побачити.
 */
export function MonthEntriesTable({
  entries,
  showAuthor,
  onChanged,
  isFiltered = false,
  isLoading = false,
  className,
}: MonthEntriesTableProps) {
  const t = useT();
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
        <h2 className="text-[15px] font-semibold">{t.hours.monthTableTitle}</h2>
        {entries.length > 0 && (
          <p className="tabular shrink-0 text-[13px] text-ink-2">
            {fmt(s.entriesTotal, { total: formatHoursShort(totalMinutes), n: entries.length })}
          </p>
        )}
      </div>

      {isLoading && entries.length === 0 ? (
        <div className="mt-3 space-y-2" aria-hidden>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[52px] rounded-card" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink-2">
          {isFiltered ? s.emptyFilteredTitle : t.hours.monthTableEmpty}
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-2 lg:hidden">
            {visibleEntries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} showAuthor={showAuthor} onChanged={onChanged} />
            ))}
          </ul>

          <DesktopTable entries={visibleEntries} showAuthor={showAuthor} onChanged={onChanged} />
        </>
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

function DesktopTable({
  entries,
  showAuthor,
  onChanged,
}: {
  entries: readonly WorkEntryWithNames[];
  showAuthor: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const s = t.hoursUi;
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mt-3 hidden lg:block">
      <div ref={scrollRef} id="month-entries-scroll" className="no-scrollbar overflow-x-auto">
        <TicketTable className="min-w-[640px]">
          <TicketTableHeader>
            <tr>
              {showAuthor && <TicketTableHead>{t.hours.monthTableWorkerColumn}</TicketTableHead>}
              <TicketTableHead>{t.hours.monthTableDateColumn}</TicketTableHead>
              <TicketTableHead>{t.hours.monthTableTimeColumn}</TicketTableHead>
              <TicketTableHead>{t.hours.break}</TicketTableHead>
              <TicketTableHead>{t.hours.monthTableObjectColumn}</TicketTableHead>
              <TicketTableHead numeric>{s.monthTableHoursColumn}</TicketTableHead>
              <TicketTableHead>{s.monthTableSourceColumn}</TicketTableHead>
              <TicketTableHead>{s.monthTableDescriptionColumn}</TicketTableHead>
              <TicketTableHead className="sticky right-0 bg-ticket" aria-hidden />
            </tr>
          </TicketTableHeader>

          <tbody>
            {entries.map((entry) => {
              const pauseMinutes = breakMinutes(entry.break_start, entry.break_end);

              return (
                <TicketTableRow key={entry.id}>
                  {showAuthor && (
                    <TicketTableCell className="max-w-[140px] truncate font-medium">
                      {entry.author_full_name}
                    </TicketTableCell>
                  )}
                  <TicketTableCell className="tabular text-ink-2">
                    {formatWorkDateShort(entry.work_date, locale)}
                  </TicketTableCell>
                  <TicketTableCell className="tabular text-ink-2">
                    {formatTimeShort(entry.started_at)}–
                    {entry.ended_at ? formatTimeShort(entry.ended_at) : (
                      <StampTag>{t.hours.entryOngoing}</StampTag>
                    )}
                  </TicketTableCell>
                  <TicketTableCell className="tabular text-ink-2">
                    {pauseMinutes > 0 ? formatHoursShort(pauseMinutes) : t.common.dash}
                  </TicketTableCell>
                  <TicketTableCell className="max-w-[160px] truncate">
                    {entry.site_name ?? t.hours.noObject}
                  </TicketTableCell>
                  <TicketTableCell numeric className="font-semibold">
                    {entry.total_minutes !== null ? formatHoursShort(entry.total_minutes) : t.common.dash}
                  </TicketTableCell>
                  <TicketTableCell className="text-ink-2">
                    {entry.source === "timer" ? s.sourceTimer : <StampTag>{s.sourceManual}</StampTag>}
                  </TicketTableCell>
                  <TicketTableCell className="max-w-[160px] truncate text-ink-2">
                    {entry.description || s.noDescription}
                  </TicketTableCell>
                  <TicketTableCell className="sticky right-0 bg-ticket">
                    <EntryActions entry={entry} onChanged={onChanged} />
                  </TicketTableCell>
                </TicketTableRow>
              );
            })}
          </tbody>
        </TicketTable>
      </div>
      <HorizontalScrollbar scrollRef={scrollRef} />
    </div>
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
  const locale = useLocale();
  const s = t.hoursUi;
  const pauseMinutes = breakMinutes(entry.break_start, entry.break_end);
  const isOngoing = entry.ended_at === null;
  const subtitle = [showAuthor ? entry.author_full_name : null, entry.site_name ?? t.hours.noObject]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <Ticket compact>
        <TicketStub className="w-(--ticket-stub)" aria-label={formatWorkDateShort(entry.work_date, locale)}>
          <span className="tabular text-[18px] leading-none font-semibold">
            {entry.work_date.slice(8, 10)}
          </span>
          <span className="tabular text-[12px] leading-none text-ink-2">
            {entry.work_date.slice(5, 7)}
          </span>
        </TicketStub>

        <TicketBody className="flex items-center gap-2.5 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="tabular flex flex-wrap items-center gap-1.5 text-[14px] font-semibold">
              <span className="truncate">
                {formatTimeShort(entry.started_at)}–
                {entry.ended_at ? formatTimeShort(entry.ended_at) : ""}
              </span>
              {isOngoing && <StampTag>{t.hours.entryOngoing}</StampTag>}
              {entry.source === "manual" && <StampTag>{s.sourceManual}</StampTag>}
              {pauseMinutes > 0 && (
                <span className="flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-ink-2">
                  <Pause className="size-3 fill-current" aria-hidden />
                  {formatHoursShort(pauseMinutes)}
                </span>
              )}
            </p>
            <p className="truncate text-[12px] text-ink-2">{subtitle}</p>
          </div>

          <p className="tabular shrink-0 text-[15px] font-semibold">
            {entry.total_minutes !== null ? formatHoursShort(entry.total_minutes) : t.common.dash}
          </p>

          <EntryActions entry={entry} onChanged={onChanged} />
        </TicketBody>
      </Ticket>
    </li>
  );
}

function EntryActions({ entry, onChanged }: { entry: WorkEntryWithNames; onChanged: () => void }) {
  const t = useT();
  if (!entry.ended_at) return <span className="w-[64px] shrink-0 lg:hidden" aria-hidden />;

  return (
    <div className="flex shrink-0 items-center justify-end gap-0.5">
      <Link
        href={`/time/manual/${entry.id}`}
        aria-label={t.hours.editEntry}
        className="relative flex size-8 shrink-0 items-center justify-center rounded-md text-ink-2 outline-none before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Pencil className="size-4" strokeWidth={1.9} aria-hidden />
      </Link>
      <DeleteEntryButton entryId={entry.id} onDeleted={onChanged} iconOnly className="size-8" />
    </div>
  );
}
