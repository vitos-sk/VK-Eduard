"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { DeleteEntryButton } from "@/components/entries/DeleteEntryButton";
import { EntryEditDialog } from "@/components/more/admin/entries/EntryEditDialog";
import { formatHoursShort, formatTimeShort, formatWorkDateShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import type { Site } from "@/modules/sites/queries";
import { breakMinutes } from "@/modules/time/calc";

interface EntriesAdminListProps {
  entries: readonly WorkEntryWithNames[];
  sites: readonly Site[];
  /** Викликається після успішного редагування чи видалення — батько перезапитує дані. */
  onChanged: () => void;
}

/**
 * Список записів часу компанії: справжня таблиця на десктопі (`≥lg`),
 * картки на мобільному — той самий рядок даних, два рендери (той самий
 * патерн, що й у `SiteAdminList`). Дії редагування/видалення показуємо
 * тільки для закритих змін — відкриту зміну (`ended_at === null`) міняти
 * тут нема сенсу, вона ще триває.
 */
export function EntriesAdminList({ entries, sites, onChanged }: EntriesAdminListProps) {
  const [editingEntry, setEditingEntry] = useState<WorkEntryWithNames | null>(null);

  return (
    <>
      {/* Desktop: справжня таблиця. */}
      <div className="hidden overflow-hidden rounded-[12px] border border-border bg-surface lg:block">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="px-3 py-2.5 font-semibold">{t.admin.entries.columnDate}</th>
              <th className="px-3 py-2.5 font-semibold">{t.admin.entries.columnWorker}</th>
              <th className="px-3 py-2.5 font-semibold">{t.admin.entries.columnSite}</th>
              <th className="px-3 py-2.5 font-semibold">{t.admin.entries.columnTime}</th>
              <th className="px-3 py-2.5 font-semibold">{t.admin.entries.columnBreak}</th>
              <th className="px-3 py-2.5 text-right font-semibold">{t.admin.entries.columnHours}</th>
              <th className="px-3 py-2.5 font-semibold">{t.admin.entries.columnSource}</th>
              <th className="px-3 py-2.5 font-semibold">{t.admin.entries.columnDescription}</th>
              <th className="px-3 py-2.5 text-right font-semibold">
                <span className="sr-only">{t.hours.editEntry}</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {entries.map((entry) => {
              const pauseMinutes = breakMinutes(entry.break_start, entry.break_end);
              const isClosed = entry.ended_at !== null;

              return (
                <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                  <td className="tabular px-3 py-2.5 whitespace-nowrap text-text-muted">
                    {formatWorkDateShort(entry.work_date)}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2.5 font-bold">
                    {entry.author_full_name}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2.5">
                    {entry.site_name ?? t.admin.entries.noSite}
                  </td>
                  <td className="tabular px-3 py-2.5 whitespace-nowrap text-text-muted">
                    {formatTimeShort(entry.started_at)}–
                    {entry.ended_at ? formatTimeShort(entry.ended_at) : t.hours.entryOngoing}
                  </td>
                  <td className="tabular px-3 py-2.5 whitespace-nowrap text-text-muted">
                    {pauseMinutes > 0 ? formatHoursShort(pauseMinutes) : t.common.dash}
                  </td>
                  <td className="tabular px-3 py-2.5 text-right font-bold whitespace-nowrap">
                    {entry.total_minutes !== null ? formatHoursShort(entry.total_minutes) : t.common.dash}
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">
                    {entry.source === "timer" ? t.admin.entries.sourceTimer : t.admin.entries.sourceManual}
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2.5 text-text-muted">
                    {entry.description || t.admin.entries.noDescription}
                  </td>
                  <td className="px-3 py-2.5">
                    {isClosed && (
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditingEntry(entry)}
                          aria-label={t.hours.editEntry}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                          <Pencil className="size-[15px]" strokeWidth={2} aria-hidden />
                        </button>
                        <DeleteEntryButton entryId={entry.id} onDeleted={onChanged} iconOnly className="size-8" />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: картки, той самий патерн, що й у решті застосунку. */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {entries.map((entry) => {
          const pauseMinutes = breakMinutes(entry.break_start, entry.break_end);
          const isClosed = entry.ended_at !== null;

          return (
            <li key={entry.id} className="rounded-[16px] border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold">{entry.author_full_name}</p>
                  <p className="mt-0.5 truncate text-[13px] font-medium text-text-muted">
                    {entry.site_name ?? t.admin.entries.noSite}
                  </p>
                </div>
                <span className="tabular shrink-0 text-[13px] font-bold text-text-muted">
                  {formatWorkDateShort(entry.work_date)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-text-muted">
                <span className="tabular text-text">
                  {formatTimeShort(entry.started_at)}–
                  {entry.ended_at ? formatTimeShort(entry.ended_at) : t.hours.entryOngoing}
                </span>
                {pauseMinutes > 0 && (
                  <span>
                    {t.hours.break}: {formatHoursShort(pauseMinutes)}
                  </span>
                )}
                <span className="tabular font-bold text-text">
                  {entry.total_minutes !== null ? formatHoursShort(entry.total_minutes) : t.common.dash}
                </span>
                <span>
                  {entry.source === "timer" ? t.admin.entries.sourceTimer : t.admin.entries.sourceManual}
                </span>
              </div>

              {entry.description && (
                <p className="mt-2 line-clamp-2 text-[14px] leading-[1.4] font-medium text-text">
                  {entry.description}
                </p>
              )}

              {isClosed && (
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingEntry(entry)}
                    aria-label={t.hours.editEntry}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted active:bg-surface-2"
                  >
                    <Pencil className="size-[16px]" strokeWidth={2} aria-hidden />
                  </button>
                  <DeleteEntryButton entryId={entry.id} onDeleted={onChanged} iconOnly />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <EntryEditDialog
        entry={editingEntry}
        sites={sites}
        onOpenChange={(open) => {
          if (!open) setEditingEntry(null);
        }}
        onSaved={() => {
          setEditingEntry(null);
          onChanged();
        }}
      />
    </>
  );
}
