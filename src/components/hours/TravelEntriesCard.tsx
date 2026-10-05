"use client";

import { Route } from "lucide-react";

import { DeleteEntryButton } from "@/components/entries/DeleteEntryButton";
import { Ticket } from "@/components/ui/ticket";
import { fmt, formatHoursShort, formatTimeShort, formatWorkDateShort, pluralize } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { deleteTravelEntry } from "@/modules/travel/actions";
import type { TravelEntryWithNames } from "@/modules/travel/queries";

interface TravelEntriesCardProps {
  entries: readonly TravelEntryWithNames[];
  /** Подписывать поездку именем сотрудника (шеф в командном режиме). */
  showAuthor: boolean;
  onChanged: () => void;
  className?: string;
  /** Вместо пустоты показать подсказку «поїздок немає» (режим «Час у дорозі»). */
  showEmpty?: boolean;
}

/**
 * Блок «Дорога» на «Годинах»: поездки на объекты за месяц — время и километры.
 * Живёт отдельно от «Зміни за місяць»: в рабочие часы, расчёт зарплаты и экспорт часов не входит.
 * Нет ни одной поездки (и нет таблицы в базе) — блок не показывается вовсе.
 */
export function TravelEntriesCard({ entries, showAuthor, onChanged, className, showEmpty }: TravelEntriesCardProps) {
  const t = useT();
  const locale = useLocale();

  if (entries.length === 0) {
    if (!showEmpty) return null;

    return (
      <Ticket asChild variant="flat">
        <section className={className}>
          <p className="text-[14px] text-ink-2">{t.travel.empty}</p>
        </section>
      </Ticket>
    );
  }

  const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
  const totalKm = entries.reduce((sum, entry) => sum + (entry.km ?? 0), 0);

  return (
    <Ticket asChild variant="flat">
      <section className={className}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Route className="size-4 text-primary" strokeWidth={1.9} aria-hidden />
            {t.travel.title}
          </h2>
          <p className="tabular shrink-0 text-[13px] text-ink-2">
            {t.travel.total}: {formatHoursShort(totalMinutes)} {t.units.hoursShort}
            {totalKm > 0 && ` · ${Math.round(totalKm * 10) / 10} ${t.travel.kmUnit}`}
          </p>
        </div>
        <p className="mt-0.5 text-[12px] text-ink-2">
          {pluralize(entries.length, locale, { one: t.travel.tripsOne, few: t.travel.tripsFew, many: t.travel.tripsMany })}
          {" · "}
          {t.travel.note}
        </p>

        <ul className="mt-2 space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 rounded-ctl border border-edge px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="tabular text-[14px] font-medium">
                  <span className="text-ink-2">{formatWorkDateShort(entry.work_date, locale)}</span>{" "}
                  {formatTimeShort(entry.started_at)}–{formatTimeShort(entry.ended_at)}
                </p>
                <p className="truncate text-[12px] text-ink-2">
                  {[showAuthor ? entry.author_full_name : null, entry.site_name ?? t.hours.noObject]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <div className="tabular text-right text-[14px] font-semibold">
                <p>{formatHoursShort(entry.minutes)}</p>
                {entry.km !== null && (
                  <p className="text-[12px] font-medium text-ink-2">{fmt("{km} {unit}", { km: entry.km, unit: t.travel.kmUnit })}</p>
                )}
              </div>

              <DeleteEntryButton
                entryId={entry.id}
                iconOnly
                remove={deleteTravelEntry}
                texts={{ title: t.travel.deleteTitle, body: t.travel.deleteBody, deleted: t.travel.deleted }}
                onDeleted={onChanged}
              />
            </li>
          ))}
        </ul>
      </section>
    </Ticket>
  );
}
