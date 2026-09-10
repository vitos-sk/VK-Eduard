"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { DeleteEntryButton } from "@/components/entries/DeleteEntryButton";
import { PhotoUploader } from "@/components/reports/PhotoUploader";
import { fmt, formatDateFull, formatDateShort, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { updateEntryDescription } from "@/modules/entries/actions";
import type { WorkEntryWithPhotos } from "@/modules/entries/types";
import type { EntryPhoto } from "@/modules/media/photos";
import { splitWorkedOvertime } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

interface ReportDetailProps {
  entry: WorkEntryWithPhotos;
  siteName: string | null;
  companyId: string;
  authorName: string;
  normMinutes: number;
  editable: boolean;
  photoUrls: Readonly<Record<string, string>>;
}

/** Детальная страница `/reports/[id]` — REPORTS.md, раздел 5. */
export function ReportDetail({
  entry,
  siteName,
  companyId,
  authorName,
  normMinutes,
  editable,
  photoUrls,
}: ReportDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState(entry.description);
  const [isEditing, setIsEditing] = useState(description === "");
  const [draft, setDraft] = useState(description);
  const [photos, setPhotos] = useState<EntryPhoto[]>(entry.entry_photos);
  const [urls, setUrls] = useState<Record<string, string>>({ ...photoUrls });

  const isOngoing = entry.ended_at === null;
  const { workedMinutes, overtimeMinutes } = entry.total_minutes
    ? splitWorkedOvertime(entry.total_minutes, normMinutes)
    : { workedMinutes: 0, overtimeMinutes: 0 };

  const handleSaveDescription = () => {
    startTransition(async () => {
      const result = await updateEntryDescription(entry.id, draft.trim());

      if (result.error) {
        toast(result.error);
        return;
      }

      setDescription(draft.trim());
      setIsEditing(false);
      toast(t.reportDetail.saved);
    });
  };

  return (
    <div className="pb-6">
      <BackHeader title={t.reportDetail.backTitle} href="/reports" />

      <div className="space-y-4 px-4">
        <section className="rounded-[16px] border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[20px] font-bold">{siteName ?? t.hours.noObject}</p>
              <p className="mt-1 text-[14px] font-medium text-text-muted">
                {formatDateFull(fromDateKey(entry.work_date))}
              </p>
            </div>

            {editable && !isOngoing && (
              <Link
                href={`/time/manual/${entry.id}`}
                aria-label={t.reportDetail.editTime}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted active:bg-surface-2"
              >
                <Pencil className="size-4" strokeWidth={2} aria-hidden />
              </Link>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
            <TimeCell label={t.hours.start} value={entry.started_at.slice(0, 5)} />
            <TimeCell
              label={t.hours.break}
              value={
                entry.break_start
                  ? `${entry.break_start.slice(0, 5)}–${entry.break_end?.slice(0, 5) ?? t.common.dash}`
                  : t.common.dash
              }
            />
            <TimeCell
              label={t.hours.finish}
              value={isOngoing ? t.hours.now : (entry.ended_at?.slice(0, 5) ?? t.common.dash)}
            />
          </div>

          {!isOngoing && (
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
              <TimeCell label={t.reportDetail.worked} value={`${workedMinutes} ${t.units.minutesShort}`} />
              <TimeCell
                label={t.reportDetail.overtime}
                value={overtimeMinutes > 0 ? `${overtimeMinutes} ${t.units.minutesShort}` : t.common.dash}
              />
            </div>
          )}
        </section>

        <section className="rounded-[16px] border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold">
              {description === "" ? t.reportDetail.addDescriptionTitle : t.manualTime.description}
            </h2>

            {editable && !isEditing && description !== "" && (
              <button
                type="button"
                onClick={() => {
                  setDraft(description);
                  setIsEditing(true);
                }}
                aria-label={t.reportDetail.edit}
                className="flex size-9 items-center justify-center rounded-full text-text-muted active:bg-surface-2"
              >
                <Pencil className="size-4" strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
                placeholder={t.reportDetail.addDescriptionPlaceholder}
                autoFocus
                className={cn(
                  "w-full resize-none rounded-[14px] border border-border bg-surface-2 p-4",
                  "text-[15px] leading-[1.4] font-medium text-text placeholder:text-text-dim",
                  "outline-none focus-visible:border-brand",
                )}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDescription}
                  disabled={isPending}
                  className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-brand text-[14px] font-bold text-brand-ink disabled:opacity-60"
                >
                  {t.reportDetail.save}
                </button>
                {description !== "" && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex h-11 flex-1 items-center justify-center rounded-[12px] border border-border text-[14px] font-bold text-text"
                  >
                    {t.common.cancel}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[15px] leading-[1.45] font-medium whitespace-pre-wrap text-text">
              {description}
            </p>
          )}
        </section>

        {(photos.length > 0 || editable) && (
          <section className="rounded-[16px] border border-border bg-surface p-4">
            <h2 className="text-[17px] font-bold">{t.reportDetail.photosTitle}</h2>
            <PhotoUploader
              className="mt-3"
              companyId={companyId}
              entryId={entry.id}
              photos={photos}
              urls={urls}
              onPhotosChange={setPhotos}
              onUrlsChange={(patch) => setUrls((current) => ({ ...current, ...patch }))}
              editable={editable}
            />
          </section>
        )}

        <p className="px-1 text-[13px] font-medium text-text-dim">
          {fmt(t.reportDetail.createdBy, { name: authorName })} · {formatDateShort(new Date(entry.created_at))}
        </p>

        {editable && (
          <DeleteEntryButton
            entryId={entry.id}
            onDeleted={() => {
              router.push("/reports");
              router.refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

function TimeCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] font-medium text-text-muted">{label}</p>
      <p className="tabular mt-1 text-[15px] font-bold">{value}</p>
    </div>
  );
}
