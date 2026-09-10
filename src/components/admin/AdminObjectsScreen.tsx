"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminSiteDialog } from "@/components/admin/AdminSiteDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { t } from "@/lib/i18n";
import { deleteSite, setSiteArchived } from "@/modules/sites/actions";
import type { Site } from "@/modules/sites/queries";
import { cn, getGoogleMapsDirectionsUrl } from "@/lib/utils";

interface AdminObjectsScreenProps {
  sites: readonly Site[];
  /** `storage_path` (site.photo_path) → подписана ссылка. */
  photoUrls: ReadonlyMap<string, string>;
  companyId: string;
}

/**
 * Таблиця об'єктів для десктоп-адмінки — ті самі Server Actions
 * (`createSite`/`updateSite`/`setSiteArchived`), що й мобільний `/objects`,
 * тільки модалка замість повноекранної форми і рядок замість картки.
 */
export function AdminObjectsScreen({ sites, photoUrls, companyId }: AdminObjectsScreenProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogSite, setDialogSite] = useState<Site | null | undefined>(undefined);

  const toggleArchived = (site: Site) => {
    startTransition(async () => {
      const result = await setSiteArchived(site.id, !site.archived_at);

      if (result.error) {
        toast(result.error);
        return;
      }

      router.refresh();
    });
  };

  const handleDelete = (site: Site) => {
    if (!window.confirm(t.admin.objects.deleteConfirm)) return;

    startTransition(async () => {
      const result = await deleteSite(site.id);

      if (result.error) {
        toast(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t.admin.objects.title}</h1>

        <button
          type="button"
          onClick={() => setDialogSite(null)}
          className={cn(
            "flex h-10 items-center gap-2 rounded-[12px] bg-brand px-4",
            "text-[14px] font-bold text-brand-ink",
            "transition-transform duration-150 active:scale-[0.98]",
          )}
        >
          <Plus className="size-[16px]" strokeWidth={2.4} aria-hidden />
          {t.admin.objects.addObject}
        </button>
      </div>

      {sites.length === 0 ? (
        <EmptyState className="mt-6" title={t.admin.objects.empty} />
      ) : (
        <div className="mt-5 overflow-x-auto rounded-[16px] border border-border bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="px-4 py-3 font-medium" />
                <th className="px-4 py-3 font-medium">{t.admin.objects.columnName}</th>
                <th className="px-4 py-3 font-medium">{t.admin.objects.columnKind}</th>
                <th className="px-4 py-3 font-medium">{t.admin.objects.columnAddress}</th>
                <th className="px-4 py-3 font-medium">{t.admin.objects.columnStatus}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>

            <tbody>
              {sites.map((site) => (
                <tr
                  key={site.id}
                  className={cn(
                    "border-b border-border last:border-b-0",
                    site.archived_at && "opacity-50",
                  )}
                >
                  <td className="px-4 py-3">
                    {site.photo_path && photoUrls.get(site.photo_path) ? (
                      // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
                      <img
                        src={photoUrls.get(site.photo_path)}
                        alt=""
                        className="size-9 rounded-[8px] object-cover"
                      />
                    ) : (
                      <div className="size-9 rounded-[8px] bg-surface-2" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold">{site.name}</td>
                  <td className="px-4 py-3 text-text-muted">{site.kind || t.common.dash}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {site.address ? (
                      <a
                        href={getGoogleMapsDirectionsUrl(site.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t.admin.objects.openInMaps}
                        className="inline-flex items-center gap-1 hover:text-text hover:underline"
                      >
                        <MapPin className="size-[14px] shrink-0" strokeWidth={2} aria-hidden />
                        {site.address}
                      </a>
                    ) : (
                      t.common.dash
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={site.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        aria-label={t.objects.detail.edit}
                        onClick={() => setDialogSite(site)}
                        className="flex size-8 items-center justify-center rounded-[8px] text-text-muted hover:bg-surface-2 hover:text-text"
                      >
                        <Pencil className="size-[16px]" strokeWidth={2} aria-hidden />
                      </button>

                      <button
                        type="button"
                        aria-label={site.archived_at ? t.objects.detail.restore : t.objects.detail.archive}
                        disabled={isPending}
                        onClick={() => toggleArchived(site)}
                        className="flex size-8 items-center justify-center rounded-[8px] text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-60"
                      >
                        {site.archived_at ? (
                          <ArchiveRestore className="size-[16px]" strokeWidth={2} aria-hidden />
                        ) : (
                          <Archive className="size-[16px]" strokeWidth={2} aria-hidden />
                        )}
                      </button>

                      <button
                        type="button"
                        aria-label={t.admin.objects.deleteObject}
                        disabled={isPending}
                        onClick={() => handleDelete(site)}
                        className="flex size-8 items-center justify-center rounded-[8px] text-text-muted hover:bg-surface-2 hover:text-danger disabled:opacity-60"
                      >
                        <Trash2 className="size-[16px]" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminSiteDialog
        open={dialogSite !== undefined}
        onOpenChange={(open) => {
          if (!open) setDialogSite(undefined);
        }}
        site={dialogSite ?? undefined}
        photoUrl={dialogSite?.photo_path ? photoUrls.get(dialogSite.photo_path) : null}
        companyId={companyId}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
