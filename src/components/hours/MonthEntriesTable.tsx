"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { DeleteEntryButton } from "@/components/entries/DeleteEntryButton";
import { formatHoursShort, formatTimeShort, formatWorkDateShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { breakMinutes } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

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
      className="relative mt-2 h-[6px] rounded-full bg-surface-2"
      role="scrollbar"
      aria-orientation="horizontal"
      aria-label={t.hours.monthTableScrollHint}
      aria-controls="month-entries-scroll"
      aria-valuenow={Math.round(thumb.leftPct)}
      aria-valuemin={0}
      aria-valuemax={Math.round(100 - thumb.widthPct)}
    >
      <div
        className="absolute inset-y-0 touch-none rounded-full bg-primary"
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
  /** Шеф видит колонку «Ім'я» — у него в списке смены всей компанії. */
  showAuthor: boolean;
  /** Вызывается после успешного удаления — родитель перезапрашивает данные. */
  onChanged: () => void;
  className?: string;
}

/**
 * Узкая таблица всех смен за месяц внизу экрана «Години». Что именно
 * попадёт в `entries` (свои смены или вся компанія) решает RLS на запросе
 * `getCompanyEntriesInRange` — компонент только рисует то, що прийшло, тож
 * іконки редагування/видалення показуємо завжди: `entries_update`/
 * `entries_delete` дозволяють це для будь-якого рядка, який тут узагалі
 * можна побачити (своя запис рабочому, будь-яка шефу).
 */
export function MonthEntriesTable({
  entries,
  showAuthor,
  onChanged,
  className,
}: MonthEntriesTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <section
      className={cn(
        "rounded-[16px] border border-border bg-surface p-4",
        className,
      )}
    >
      <h2 className="text-[17px] font-bold">{t.hours.monthTableTitle}</h2>

      {entries.length === 0 ? (
        <p className="mt-2 text-[14px] font-medium text-text-muted">
          {t.hours.monthTableEmpty}
        </p>
      ) : (
        <div
          ref={scrollRef}
          id="month-entries-scroll"
          className="no-scrollbar -mx-4 mt-3 overflow-x-auto px-4"
        >
          <table className="w-full min-w-[420px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="text-text-muted">
                {showAuthor && (
                  <th className="pb-2 pr-3 font-medium">
                    {t.hours.monthTableWorkerColumn}
                  </th>
                )}
                <th className="pb-2 pr-3 font-medium">
                  {t.hours.monthTableDateColumn}
                </th>
                <th className="pb-2 pr-3 font-medium">
                  {t.hours.monthTableTimeColumn}
                </th>
                <th className="pb-2 pr-3 font-medium">
                  {t.hours.break}
                </th>
                <th className="pb-2 font-medium">
                  {t.hours.monthTableObjectColumn}
                </th>
                <th className="pb-2 pl-2" aria-hidden />
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => {
                const pauseMinutes = breakMinutes(entry.break_start, entry.break_end);

                return (
                  <tr key={entry.id} className="border-t border-border">
                    {showAuthor && (
                      <td className="max-w-[120px] truncate py-2 pr-3 font-bold">
                        {entry.author_full_name}
                      </td>
                    )}
                    <td className="tabular py-2 pr-3 text-text-muted">
                      {formatWorkDateShort(entry.work_date)}
                    </td>
                    <td className="tabular py-2 pr-3 text-text-muted">
                      {formatTimeShort(entry.started_at)}–
                      {entry.ended_at
                        ? formatTimeShort(entry.ended_at)
                        : t.hours.entryOngoing}
                    </td>
                    <td className="tabular py-2 pr-3 text-text-muted">
                      {pauseMinutes > 0 ? formatHoursShort(pauseMinutes) : t.common.dash}
                    </td>
                    <td className="max-w-[140px] truncate py-2">
                      {entry.site_name ?? t.hours.noObject}
                    </td>
                    <td className="py-2 pl-2">
                      {entry.ended_at && (
                        <div className="flex items-center justify-end gap-0.5">
                          <Link
                            href={`/time/manual/${entry.id}`}
                            aria-label={t.hours.editEntry}
                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted active:bg-surface-2"
                          >
                            <Pencil className="size-[15px]" strokeWidth={2} aria-hidden />
                          </Link>
                          <DeleteEntryButton
                            entryId={entry.id}
                            onDeleted={onChanged}
                            iconOnly
                            className="size-8"
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {entries.length > 0 && <HorizontalScrollbar scrollRef={scrollRef} />}
    </section>
  );
}
