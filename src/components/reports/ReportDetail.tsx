"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Pencil, Route } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { DeleteReportButton } from "@/components/reports/DeleteReportButton";
import { ReportPhotoUploader } from "@/components/reports/ReportPhotoUploader";
import { isOtherSelected, WorkCategoryChips } from "@/components/reports/WorkCategoryChips";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Thumb } from "@/components/shared/Thumb";
import { fmt, formatDateShort, formatHoursShort, formatTimeShort } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { sceneForId } from "@/lib/siteScene";
import type { WorkEntry } from "@/modules/entries/types";
import type { TravelEntry } from "@/modules/travel/queries";
import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import type { Site } from "@/modules/sites/queries";
import {
  updateReportCategories,
  updateReportDescription,
  updateReportProblem,
  updateReportSite,
} from "@/modules/reports/actions";
import { breakMinutes } from "@/modules/time/calc";
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
  siteId: string | null;
  /** Подписанная ссылка на фото объекта; нет фото — рисуется сцена-заглушка. */
  siteImageUrl: string | null;
  /** Смены автора за этот день на этом объекте — отработанное время по отчёту. */
  entries: readonly WorkEntry[];
  /** Поездки автора за этот день на этом объекте — «дорога», отдельно от рабочего времени. */
  travel?: readonly TravelEntry[];
  /** Активные объекты компании — для выбора объекта отчёта. */
  sites: readonly Site[];
}

/**
 * Детальная страница `/reports/[id]` — REPORTS.md, раздел 5: фото объекта, категории, опис,
 * відпрацьований час (зміни автора за цей день на цьому об'єкті) і блок «Проблемне місце».
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
  siteId,
  siteImageUrl,
  entries,
  travel = [],
  sites,
}: ReportDetailProps) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [isDescPending, startDescTransition] = useTransition();
  const [isCatPending, startCatTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const editable = canEdit && isEditing;

  const [description, setDescription] = useState(report.description);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [draft, setDraft] = useState(description);

  const [isSitePending, startSiteTransition] = useTransition();
  const [isSitePickerOpen, setIsSitePickerOpen] = useState(false);
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(siteId);
  const [isProblemPending, startProblemTransition] = useTransition();
  const [problem, setProblem] = useState(report.problem_note ?? "");
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  const [problemDraft, setProblemDraft] = useState(problem);

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

  // Объект можно поставить или сменить и после создания отчёта; время и дорога переезжают вместе с ним.
  const handleSiteSelect = (nextSiteId: string) => {
    startSiteTransition(async () => {
      const result = await updateReportSite(report.id, nextSiteId);

      if (result.error) {
        toast(result.error);
        return;
      }

      setCurrentSiteId(nextSiteId);
      toast(t.reportDetail.siteSaved);
      router.refresh();
    });
  };

  const currentSiteName = currentSiteId
    ? (sites.find((site) => site.id === currentSiteId)?.name ?? (currentSiteId === siteId ? siteName : null))
    : null;

  const handleSaveProblem = () => {
    startProblemTransition(async () => {
      const result = await updateReportProblem(report.id, problemDraft);

      if (result.error) {
        toast(result.error);
        return;
      }

      setProblem(problemDraft.trim());
      setIsEditingProblem(false);
      toast(t.reportDetail.saved);
    });
  };

  const totalWorkedMinutes = entries.reduce((sum, entry) => sum + (entry.total_minutes ?? 0), 0);

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
      {/* Картинка объекта: его фото или сцена-заглушка */}
      {(currentSiteId || siteImageUrl) && (
        <Thumb scene={sceneForId(currentSiteId ?? report.id)} photoUrl={currentSiteId === siteId ? siteImageUrl : null} size="cover" />
      )}

      <Ticket asChild>
        <section>
          <DateStub date={report.work_date} />
          <TicketBody className="flex flex-col justify-center">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-[18px] leading-tight font-semibold">{currentSiteName ?? t.hours.noObject}</h1>

              {canEdit && (
                <Button
                  variant={currentSiteId ? "ghost" : "outline"}
                  size={currentSiteId ? "icon-sm" : "sm"}
                  onClick={() => setIsSitePickerOpen(true)}
                  loading={isSitePending}
                  aria-label={currentSiteId ? t.reportDetail.changeSite : t.reportDetail.addSite}
                >
                  {currentSiteId ? (
                    <Pencil className="size-4" strokeWidth={1.9} aria-hidden />
                  ) : (
                    t.reportDetail.addSite
                  )}
                </Button>
              )}
            </div>
            <p className="mt-1 text-[13px] text-ink-2">
              {fmt(t.reportDetail.createdBy, { name: authorName })} ·{" "}
              <span className="tabular">{formatDateShort(new Date(report.created_at), locale)}</span>
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
              {description === "" ? t.reportDetail.addDescriptionTitle : t.reportDetail.descriptionTitle}
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

      {/* Проблемное место: что забрало время */}
      {(canEdit || problem !== "") && (
        <Ticket asChild variant="flat">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold">{t.reportDetail.problemTitle}</h2>

              {canEdit && !isEditingProblem && (
                <Button
                  variant={problem === "" ? "outline" : "ghost"}
                  size={problem === "" ? "sm" : "icon-sm"}
                  onClick={() => {
                    setProblemDraft(problem);
                    setIsEditingProblem(true);
                  }}
                  aria-label={problem === "" ? t.reportDetail.problemAdd : t.reportDetail.edit}
                >
                  {problem === "" ? (
                    t.reportDetail.problemAdd
                  ) : (
                    <Pencil className="size-4" strokeWidth={1.9} aria-hidden />
                  )}
                </Button>
              )}
            </div>

            {isEditingProblem ? (
              <div className="mt-2 space-y-3">
                <UnderlineTextarea
                  value={problemDraft}
                  onChange={(event) => setProblemDraft(event.target.value)}
                  rows={3}
                  placeholder={t.reportDetail.problemPlaceholder}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleSaveProblem} loading={isProblemPending}>
                    {t.reportDetail.save}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setIsEditingProblem(false)}>
                    {t.common.cancel}
                  </Button>
                </div>
              </div>
            ) : problem === "" ? (
              <p className="mt-2 text-[14px] text-ink-2">{t.reportDetail.problemHint}</p>
            ) : (
              <p className="mt-2 text-[15px] leading-[1.45] font-medium whitespace-pre-wrap text-text">{problem}</p>
            )}
          </section>
        </Ticket>
      )}

      {/* Отработанное время по отчёту */}
      <Ticket asChild variant="flat">
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">{t.reportDetail.timeTitle}</h2>
            {entries.length > 0 && (
              <span className="tabular text-[15px] font-semibold">{formatHoursShort(totalWorkedMinutes)}</span>
            )}
          </div>

          {entries.length === 0 ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[14px] text-ink-2">{t.reportDetail.timeNone}</p>
              {canEdit && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/time/manual">{t.reportDetail.timeAdd}</Link>
                </Button>
              )}
            </div>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {entries.map((entry) => {
                const pause = breakMinutes(entry.break_start, entry.break_end);

                return (
                  <li key={entry.id} className="flex items-baseline justify-between gap-3 text-[14px]">
                    <span className="tabular">
                      {formatTimeShort(entry.started_at)}–{entry.ended_at ? formatTimeShort(entry.ended_at) : ""}
                      {pause > 0 && (
                        <span className="ml-2 text-[12px] text-ink-2">{fmt(t.reportDetail.timeBreak, { n: pause })}</span>
                      )}
                    </span>
                    {/* Одна смена — её часы уже в итоге справа сверху, второй раз не повторяем */}
                    {entries.length > 1 && (
                      <span className="tabular text-ink-2">
                        {entry.total_minutes !== null ? formatHoursShort(entry.total_minutes) : t.common.dash}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Ticket>

      {/* Дорога на объект — только если время дороги записано; в рабочие часы не входит */}
      {travel.length > 0 && (
        <Ticket asChild variant="flat">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <Route className="size-4 text-primary" strokeWidth={1.9} aria-hidden />
                {t.travel.title}
              </h2>
              <span className="tabular text-[15px] font-semibold">
                {formatHoursShort(travel.reduce((sum, trip) => sum + trip.minutes, 0))}
              </span>
            </div>

            <ul className="mt-2 space-y-1.5">
              {travel.map((trip) => (
                <li key={trip.id} className="flex items-baseline justify-between gap-3 text-[14px]">
                  <span className="tabular">
                    {formatTimeShort(trip.started_at)}–{formatTimeShort(trip.ended_at)}
                  </span>
                  <span className="tabular text-ink-2">
                    {travel.length > 1 && formatHoursShort(trip.minutes)}
                    {trip.km !== null && `${travel.length > 1 ? " · " : ""}${fmt("{km} {unit}", { km: trip.km, unit: t.travel.kmUnit })}`}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-1.5 text-[12px] text-ink-2">{t.travel.note}</p>
          </section>
        </Ticket>
      )}
    </>
  );

  const sitePicker = (
    <ObjectPickerDrawer
      open={isSitePickerOpen}
      onOpenChange={setIsSitePickerOpen}
      sites={sites}
      value={currentSiteId}
      onSelect={handleSiteSelect}
    />
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
      {sitePicker}

      <div className="space-y-3 px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-8 lg:space-y-0 lg:px-0">
        <div className="space-y-3 lg:col-start-2 lg:row-start-1">{content}</div>
        {photosSection && <div className="lg:col-start-1 lg:row-start-1">{photosSection}</div>}
      </div>
    </div>
  );
}
