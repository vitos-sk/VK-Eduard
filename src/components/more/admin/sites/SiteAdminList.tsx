import Link from "next/link";
import { MapPin } from "lucide-react";

import { SiteRowActions } from "@/components/more/admin/sites/SiteRowActions";
import type { SiteWithStats } from "@/components/more/admin/sites/AdminSitesScreen";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SiteAdminListProps {
  sites: readonly SiteWithStats[];
}

/**
 * Список об'єктів: справжня таблиця на десктопі (`≥lg`), картки на мобільному —
 * той самий рядок даних, два рендери. На відміну від `ObjectCard` (карточка
 * веде на деталку одразу всім тапом) тут дії (архів/видалення) — окремі
 * кнопки поруч з рядком, а не всередині клікабельної області.
 */
export function SiteAdminList({ sites }: SiteAdminListProps) {
  return (
    <>
      {/* Desktop: справжня таблиця. */}
      <div className="hidden overflow-hidden rounded-[16px] border border-border bg-surface lg:block">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="px-4 py-3 font-semibold">{t.admin.sites.table.object}</th>
              <th className="px-4 py-3 font-semibold">{t.admin.sites.table.status}</th>
              <th className="px-4 py-3 text-right font-semibold">{t.admin.sites.table.hours}</th>
              <th className="px-4 py-3 text-right font-semibold">{t.admin.sites.table.workers}</th>
              <th className="px-4 py-3 text-right font-semibold">{t.admin.sites.table.actions}</th>
            </tr>
          </thead>

          <tbody>
            {sites.map((site) => (
              <tr key={site.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                <td className="max-w-0 px-4 py-3">
                  <Link
                    href={`/objects/${site.id}`}
                    className="block min-w-0 rounded-[8px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <p className="truncate font-bold text-text">{site.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] font-medium text-text-muted">
                      <MapPin className="size-3 shrink-0" strokeWidth={2} aria-hidden />
                      {site.address || t.admin.sites.noAddress}
                    </p>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {site.archived_at ? (
                    <span className="inline-flex shrink-0 items-center rounded-[8px] bg-surface-2 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-text-dim uppercase whitespace-nowrap">
                      {t.admin.sites.archivedBadge}
                    </span>
                  ) : (
                    <StatusBadge status={site.status} />
                  )}
                </td>
                <td className="tabular px-4 py-3 text-right font-bold">
                  {formatHoursShort(site.minutes)}
                </td>
                <td className="tabular px-4 py-3 text-right text-text-muted">
                  {site.workerCount}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <SiteRowActions site={site} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: картки, той самий патерн, що й в решті застосунку. */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {sites.map((site) => (
          <li
            key={site.id}
            className={cn(
              "rounded-[16px] border border-border bg-surface p-4",
              site.archived_at && "opacity-70",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <Link href={`/objects/${site.id}`} className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-bold">{site.name}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] font-medium text-text-muted">
                  <MapPin className="size-3 shrink-0" strokeWidth={2} aria-hidden />
                  {site.address || t.admin.sites.noAddress}
                </p>
              </Link>

              {site.archived_at ? (
                <span className="inline-flex shrink-0 items-center rounded-[8px] bg-surface-2 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-text-dim uppercase whitespace-nowrap">
                  {t.admin.sites.archivedBadge}
                </span>
              ) : (
                <StatusBadge status={site.status} />
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex items-center gap-3 text-[13px] font-semibold text-text-muted">
                <span className="tabular text-text">{formatHoursShort(site.minutes)}</span>
                <span aria-hidden>·</span>
                <span>{fmt(t.admin.sites.workersCount, { n: site.workerCount })}</span>
              </div>

              <SiteRowActions site={site} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
