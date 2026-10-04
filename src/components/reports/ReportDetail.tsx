"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { DeleteReportButton } from "@/components/reports/DeleteReportButton";
import { ReportPhotoUploader } from "@/components/reports/ReportPhotoUploader";
import { isOtherSelected, WorkCategoryChips } from "@/components/reports/WorkCategoryChips";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmt, formatDateShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { updateReportCategories, updateReportDescription } from "@/modules/reports/actions";
import type { ReportPhoto, SiteReportDetail, WorkCategory } from "@/modules/reports/types";
import { DateStub, Ticket, TicketBody, TicketFoot } from "@/components/ui/ticket";
import { Button } from "@/components/ui/button";
import { UnderlineTextarea } from "@/components/ui/underline-field";

interface ReportDetailProps {
  report: SiteReportDetail;
  siteName: string | null;
  companyId: string;
  authorName: string;
  categories: readonly WorkCategory[];
  /** RLS-право редагувати цей звіт — своя запис або шеф. UI-режим (перегляд/редагування) керується локальним станом нижче, а не цим прапорцем напряму. */
  canEdit: boolean;
  photoUrls: Readonly<Record<string, string>>;
}

/**
 * Детальная страница `/reports/[id]` — REPORTS.md, раздел 5 (без блоку часу).
 * Відкривається завжди в режимі перегляду: усе редагування (опис,
 * категорії, фото, видалення) ховається за «⋮» в шапці — окремий пункт
 * «Редагувати» вмикає його. Створення звіту вже має власний крок з фото
 * (`ReportForm`), тож сюди потрапляють вже готовим.
 */
export function ReportDetail({
  report,
  siteName,
  companyId,
  authorName,
  categories,
  canEdit,
  photoUrls,
}: ReportDetailProps) {
  const router = useRouter();
  const [isDescPending, startDescTransition] = useTransition();
  const [isCatPending, startCatTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const editable = canEdit && isEditing;

  const [description, setDescription] = useState(report.description);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [draft, setDraft] = useState(description);

  const [categoryIds, setCategoryIds] = useState<string[]>(report.category_ids);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<string[]>(categoryIds);
  const [otherText, setOtherText] = useState(report.other_text);
  const [otherDraft, setOtherDraft] = useState(report.other_text);

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
      const result = await updateReportCategories(report.id, categoryDraft, otherDraft);

      if (result.error) {
        toast(result.error);
        return;
      }

      setCategoryIds(categoryDraft);
      setOtherText(isOtherSelected(categories, categoryDraft) ? otherDraft.trim() : "");
      setIsEditingCategories(false);
      toast(t.reportDetail.saved);
    });
  };

  const photosSection = (photos.length > 0 || editable) && (
    <Ticket asChild variant="flat">
      <section>
        <h2 className="text-[15px] font-semibold">{t.reportDetail.photosTitle}</h2>
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
    </Ticket>
  );

  const content = (
    <>
      <Ticket asChild>
        <section>
          <DateStub date={report.work_date} />
          <TicketBody className="flex flex-col justify-center">
            <h1 className="text-[18px] leading-tight font-semibold">{siteName ?? t.hours.noObject}</h1>
            <p className="mt-1 text-[13px] text-ink-2">
              {fmt(t.reportDetail.createdBy, { name: authorName })} ·{" "}
              <span className="tabular">{formatDateShort(new Date(report.created_at))}</span>
            </p>
          </TicketBody>

          <TicketFoot>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[12px] text-ink-2">{t.reportDetail.categoriesLabel}</h2>

              {editable && !isEditingCategories && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setCategoryDraft(categoryIds);
                    setOtherDraft(otherText);
                    setIsEditingCategories(true);
                  }}
                  aria-label={t.reportDetail.edit}
                >
                  <Pencil className="size-4" strokeWidth={1.9} aria-hidden />
                </Button>
              )}
            </div>

            {isEditingCategories ? (
              <div className="space-y-3">
                <WorkCategoryChips
                  categories={categories}
                  value={categoryDraft}
                  onChange={setCategoryDraft}
                  otherText={otherDraft}
                  onOtherTextChange={setOtherDraft}
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleSaveCategories}
                    disabled={(isOtherSelected(categories, categoryDraft) && otherDraft.trim() === "")}
                    loading={isCatPending}
                  >
                    {t.reportDetail.save}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setIsEditingCategories(false)}>
                    {t.common.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <WorkCategoryChips
                categories={categories}
                value={categoryIds}
                otherText={otherText}
                onChange={() => {}}
                readOnly
              />
            )}
          </TicketFoot>
        </section>
      </Ticket>

      <Ticket asChild variant="flat">
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">
              {description === "" ? t.reportDetail.addDescriptionTitle : t.manualTime.description}
            </h2>

            {editable && !isEditingDescription && description !== "" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setDraft(description);
                  setIsEditingDescription(true);
                }}
                aria-label={t.reportDetail.edit}
              >
                <Pencil className="size-4" strokeWidth={1.9} aria-hidden />
              </Button>
            )}
          </div>

          {isEditingDescription ? (
            <div className="mt-2 space-y-3">
              <UnderlineTextarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                placeholder={t.reportDetail.addDescriptionPlaceholder}
                autoFocus
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSaveDescription} loading={isDescPending}>
                  {t.reportDetail.save}
                </Button>
                {description !== "" && (
                  <Button variant="outline" className="flex-1" onClick={() => setIsEditingDescription(false)}>
                    {t.common.cancel}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[15px] leading-[1.45] font-medium whitespace-pre-wrap text-text">
              {description}
            </p>
          )}
        </section>
      </Ticket>
    </>
  );

  const menu = canEdit && (
    <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t.reportDetail.openMenu}>
          <MoreVertical className="size-5" strokeWidth={1.9} aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-52 !border !border-edge !bg-ticket !text-text !ring-0">
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            block
            className="justify-start px-2"
            onClick={() => {
              setIsEditing(true);
              if (description === "") setIsEditingDescription(true);
              setIsMenuOpen(false);
            }}
          >
            <Pencil className="size-4" strokeWidth={1.9} aria-hidden />
            {t.reportDetail.edit}
          </Button>
        )}

        <DeleteReportButton
          reportId={report.id}
          onDeleted={() => {
            router.push("/reports");
            router.refresh();
          }}
          className="h-8 w-full justify-start gap-2 border-transparent px-2"
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="pb-6">
      <BackHeader title={t.reportDetail.backTitle} href="/reports" action={menu} />

      <div className="space-y-3 px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-8 lg:space-y-0 lg:px-0">
        <div className="space-y-3 lg:col-start-2 lg:row-start-1">{content}</div>
        {photosSection && <div className="lg:col-start-1 lg:row-start-1">{photosSection}</div>}
      </div>
    </div>
  );
}
