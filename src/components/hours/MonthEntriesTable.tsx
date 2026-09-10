import Link from "next/link";
import { Pencil } from "lucide-react";

import { DeleteEntryButton } from "@/components/entries/DeleteEntryButton";
import { formatTimeShort, formatWorkDateShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { isWithinEditWindow } from "@/modules/entries/editWindow";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { dateKeyOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

interface MonthEntriesTableProps {
  entries: readonly WorkEntryWithNames[];
  /** Шеф видит колонку «Ім'я» — у него в списке смены всей компанії. */
  showAuthor: boolean;
  /** Шеф редагує/видаляє будь-який рядок, рабочий — тільки свій у вікні 7 днів. */
  isBoss: boolean;
  /** Вызывается после успешного удаления — родитель перезапрашивает данные. */
  onChanged: () => void;
  className?: string;
}

/**
 * Узкая таблица всех смен за месяц внизу экрана «Години». Что именно
 * попадёт в `entries` (свои смены или вся компанія) решает RLS на запросе
 * `getCompanyEntriesInRange` — компонент только рисует то, что пришло.
 *
 * Іконки редагування/видалення в останній колонці показуються тільки для
 * рядків у вікні правки (`isWithinEditWindow`) — той самий розрахунок, що
 * визначає доступ до правки на `/reports/[id]`, тут повторений на клієнті
 * лише щоб не показувати дію, яку однаково відхилить RLS.
 */
export function MonthEntriesTable({
  entries,
  showAuthor,
  isBoss,
  onChanged,
  className,
}: MonthEntriesTableProps) {
  const todayKey = dateKeyOf(new Date());
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
        <div className="-mx-4 mt-3 overflow-x-auto px-4">
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
                <th className="pb-2 font-medium">
                  {t.hours.monthTableObjectColumn}
                </th>
                <th className="pb-2 pl-2" aria-hidden />
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => {
                const editable = isWithinEditWindow(entry.work_date, isBoss, todayKey);

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
                    <td className="max-w-[140px] truncate py-2">
                      {entry.site_name ?? t.hours.noObject}
                    </td>
                    <td className="py-2 pl-2">
                      {editable && entry.ended_at && (
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
    </section>
  );
}
