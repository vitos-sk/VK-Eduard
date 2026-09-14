"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { DeleteReportButton } from "@/components/reports/DeleteReportButton";
import { ReportPhotoUploader } from "@/components/reports/ReportPhotoUploader";
import { WorkCategoryChips } from "@/components/reports/WorkCategoryChips";
import { fmt, formatDateFull, formatDateShort, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { updateReportCategories, updateReportDescription } from "@/modules/reports/actions";
import type { ReportPhoto, SiteReportDetail, WorkCategory } from "@/modules/reports/types";
import { cn } from "@/lib/utils";

interface ReportDetailProps {
  report: SiteReportDetail;
  siteName: string | null;
  companyId: string;
  authorName: string;
  categories: readonly WorkCategory[];
  editable: boolean;
  photoUrls: Readonly<Record<string, string>>;
}

/** Детальная страница `/reports/[id]` — REPORTS.md, раздел 5 (без блоку часу). */
export function ReportDetail({
  report,
  siteName,
  companyId,
  authorName,
  categories,
  editable,
  photoUrls,
}: ReportDetailProps) {
  const router = useRouter();
  const [isDescPending, startDescTransition] = useTransition();
  const [isCatPending, startCatTransition] = useTransition();

  const [description, setDescription] = useState(report.description);
  const [isEditingDescription, setIsEditingDescription] = useState(description === "");
  const [draft, setDraft] = useState(description);

  const [categoryIds, setCategoryIds] = useState<string[]>(report.category_ids);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<string[]>(categoryIds);

  const [photos, setPhotos] = useState<ReportPhoto[]>(report.report_photos);
  const [urls, setUrls] = useState<Record<string, string>>({ ...photoUrls });

  const handleSaveDescription = () => {
    startDescTransition(async () => {
      const result = await updateReportDescription(report.id, draft.trim());

      if (result.error) {
        toast(result.error);
        return;
      }

      setDescription(draft.trim());
      setIsEditingDescription(false);
      toast(t.reportDetail.saved);
    });
  };

  const handleSaveCategories = () => {
    startCatTransition(async () => {
      const result = await updateReportCategories(report.id, categoryDraft);

      if (result.error) {
        toast(result.error);
        return;
      }

      setCategoryIds(categoryDraft);
      setIsEditingCategories(false);
      toast(t.reportDetail.saved);
    });
  };

  const photosSection = (photos.length > 0 || editable) && (
    <section className="rounded-[16px] border border-border bg-surface p-4">
      <h2 className="text-[17px] font-bold">{t.reportDetail.photosTitle}</h2>
      <ReportPhotoUploader
        className="mt-3"
        companyId={companyId}
        reportId={report.id}
        photos={photos}
        urls={urls}
        onPhotosChange={setPhotos}
        onUrlsChange={(patch) => setUrls((current) => ({ ...current, ...patch }))}
        editable={editable}
      />
    </section>
  );

  const content = (
    <>
      <section className="rounded-[16px] border border-border bg-surface p-4">
        <p className="text-[20px] font-bold">{siteName ?? t.hours.noObject}</p>
        <p className="mt-1 text-[14px] font-medium text-text-muted">
          {formatDateFull(fromDateKey(report.work_date))}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <h2 className="text-[15px] font-bold">{t.reportDetail.categoriesLabel}</h2>

          {editable && !isEditingCategories && (
            <button
              type="button"
              onClick={() => {
                setCategoryDraft(categoryIds);
                setIsEditingCategories(true);
              }}
              aria-label={t.reportDetail.edit}
              className="flex size-9 items-center justify-center rounded-full text-text-muted active:bg-surface-2"
            >
              <Pencil className="size-4" strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>

        {isEditingCategories ? (
          <div className="mt-3 space-y-3">
            <WorkCategoryChips categories={[...categories]} value={categoryDraft} onChange={setCategoryDraft} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveCategories}
                disabled={isCatPending}
                className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-brand text-[14px] font-bold text-brand-ink disabled:opacity-60"
              >
                {t.reportDetail.save}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingCategories(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-[12px] border border-border text-[14px] font-bold text-text"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        ) : (
          <WorkCategoryChips
            className="mt-3"
            categories={[...categories]}
            value={categoryIds}
            onChange={() => {}}
            readOnly
          />
        )}
      </section>

      <section className="rounded-[16px] border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold">
            {description === "" ? t.reportDetail.addDescriptionTitle : t.manualTime.description}
          </h2>

          {editable && !isEditingDescription && description !== "" && (
            <button
              type="button"
              onClick={() => {
                setDraft(description);
                setIsEditingDescription(true);
              }}
              aria-label={t.reportDetail.edit}
              className="flex size-9 items-center justify-center rounded-full text-text-muted active:bg-surface-2"
            >
              <Pencil className="size-4" strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>

        {isEditingDescription ? (
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
                disabled={isDescPending}
                className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-brand text-[14px] font-bold text-brand-ink disabled:opacity-60"
              >
                {t.reportDetail.save}
              </button>
              {description !== "" && (
                <button
                  type="button"
                  onClick={() => setIsEditingDescription(false)}
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

      <div className="lg:hidden">{photosSection}</div>

      <p className="px-1 text-[13px] font-medium text-text-dim">
        {fmt(t.reportDetail.createdBy, { name: authorName })} · {formatDateShort(new Date(report.created_at))}
      </p>

      {editable && (
        <DeleteReportButton
          reportId={report.id}
          onDeleted={() => {
            router.push("/reports");
            router.refresh();
          }}
        />
      )}
    </>
  );

  return (
    <div className="pb-6">
      <BackHeader title={t.reportDetail.backTitle} href="/reports" />

      <div className="space-y-4 px-4 lg:hidden">{content}</div>

      {/* Desktop: галерея фото зліва/ширше, деталі справа — паралельна гілка. */}
      <div className="hidden px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-8">
        <div className="flex flex-col gap-4">{photosSection}</div>

        <div className="flex flex-col gap-4">{content}</div>
      </div>
    </div>
  );
}
