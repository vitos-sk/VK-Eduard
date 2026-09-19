"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, Download, Loader2, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";

import { downloadExportFile, shareExportFile } from "@/components/reports/shareExport";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { reportsStrings as s } from "@/lib/i18n/parts/reports";
import { cn } from "@/lib/utils";
import {
  HOURS_FORMATS,
  REPORTS_FORMATS,
  type ExportFormat,
  type ExportKind,
} from "@/modules/export/formats";

const FORMAT_STORAGE_KEY = "export:format";
/** Пошук у списку співробітників корисний, лише коли їх багато. */
const SEARCH_THRESHOLD = 7;

interface WorkerOption {
  id: string;
  name: string;
}

interface TeamExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: string;
  to: string;
  /** Підпис періоду для підсумку, напр. «Вересень 2026». */
  periodLabel: string;
  workers: readonly WorkerOption[];
  /** Порожньо — уся команда. */
  workerIds: readonly string[];
  onWorkerIdsChange: (ids: string[]) => void;
  kind: ExportKind;
  onKindChange: (kind: ExportKind) => void;
}

const KIND_OPTIONS = [
  { value: "hours" as const, label: s.export.hours },
  { value: "reports" as const, label: s.export.reports },
];

function readStoredFormat(): ExportFormat {
  try {
    const value = window.localStorage.getItem(FORMAT_STORAGE_KEY);
    if (value === "csv" || value === "xlsx" || value === "pdf") return value;
  } catch {
    // Немає доступу до сховища — беремо значення за замовчуванням.
  }
  return "xlsx";
}

/**
 * Лист експорту: що (години/звіти) → кого → формат → «Завантажити» або
 * «Надіслати в WhatsApp». Порожній вибір співробітників = усі. Формат
 * запам'ятовується; для звітів доступний лише CSV.
 */
export function TeamExportSheet({
  open,
  onOpenChange,
  from,
  to,
  periodLabel,
  workers,
  workerIds,
  onWorkerIdsChange,
  kind,
  onKindChange,
}: TeamExportSheetProps) {
  const [preferredFormat, setPreferredFormat] = useState<ExportFormat>(() =>
    typeof window === "undefined" ? "xlsx" : readStoredFormat(),
  );
  const [isWorkersOpen, setIsWorkersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<"download" | "share" | null>(null);

  const formats = kind === "reports" ? REPORTS_FORMATS : HOURS_FORMATS;
  const format = formats.some((option) => option.format === preferredFormat)
    ? preferredFormat
    : formats[0].format;

  const scopeLabel =
    workerIds.length === 0
      ? s.export.scopeAll
      : workerIds.length === 1
        ? (workers.find((worker) => worker.id === workerIds[0])?.name ?? fmt(s.export.scopeSome, { n: 1 }))
        : fmt(s.export.scopeSome, { n: workerIds.length });

  const visibleWorkers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? workers.filter((worker) => worker.name.toLowerCase().includes(query)) : workers;
  }, [workers, search]);

  const toggleWorker = (id: string) => {
    onWorkerIdsChange(workerIds.includes(id) ? workerIds.filter((item) => item !== id) : [...workerIds, id]);
  };

  const chooseFormat = (next: ExportFormat) => {
    setPreferredFormat(next);
    try {
      window.localStorage.setItem(FORMAT_STORAGE_KEY, next);
    } catch {
      // Не критично: формат просто не запам'ятається.
    }
  };

  const run = async (mode: "download" | "share") => {
    setBusy(mode);
    const params = { from, to, format, kind, workerIds };
    const ok = mode === "download" ? await downloadExportFile(params) : await shareExportFile(params);
    setBusy(null);

    if (ok) {
      if (mode === "download") toast(s.export.downloaded);
      onOpenChange(false);
    }
  };

  const whatLabel = kind === "reports" ? s.export.reports : s.export.hours;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        aria-describedby={undefined}
        className="mx-auto max-w-[430px] border-t border-border bg-surface text-text data-[vaul-drawer-direction=bottom]:max-h-[88dvh]"
      >
        <div className="flex items-center gap-1 px-2 pt-3">
          <DrawerClose
            aria-label={t.common.back}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-text transition-colors duration-150 active:bg-surface-2"
          >
            <ChevronLeft className="size-6" strokeWidth={2.4} aria-hidden />
          </DrawerClose>
          <div className="min-w-0">
            <DrawerTitle className="text-[20px] font-bold text-text">{s.export.title}</DrawerTitle>
            <p className="truncate text-[13px] font-medium text-text-muted">
              {fmt(s.export.summary, { what: whatLabel, period: periodLabel })}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-4 pb-4">
          <section>
            <p className="text-[12px] font-medium text-text-muted">{s.export.whatLabel}</p>
            <SegmentedTabs
              className="mt-1.5"
              label={s.export.whatLabel}
              options={KIND_OPTIONS}
              value={kind}
              onChange={onKindChange}
            />
          </section>

          <section>
            <p className="text-[12px] font-medium text-text-muted">{s.export.whoLabel}</p>
            <button
              type="button"
              onClick={() => setIsWorkersOpen((current) => !current)}
              aria-expanded={isWorkersOpen}
              className="mt-1.5 flex h-12 w-full items-center gap-2 rounded-[14px] border border-border bg-surface-2 px-3 text-left"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{scopeLabel}</span>
              <ChevronDown
                className={cn("size-5 shrink-0 text-text-muted transition-transform duration-150", isWorkersOpen && "rotate-180")}
                strokeWidth={2.2}
                aria-hidden
              />
            </button>

            {isWorkersOpen && (
              <div className="mt-2 rounded-[14px] border border-border bg-surface-2 p-1.5">
                {workers.length > SEARCH_THRESHOLD && (
                  <div className="mb-1 flex h-10 items-center gap-2 rounded-[10px] bg-surface px-3">
                    <Search className="size-4 shrink-0 text-text-dim" strokeWidth={2} aria-hidden />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={s.export.searchPlaceholder}
                      aria-label={s.export.searchPlaceholder}
                      className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-text-dim"
                    />
                  </div>
                )}

                <ul className="max-h-[220px] overflow-y-auto">
                  <li>
                    <WorkerRow
                      label={s.export.scopeAll}
                      checked={workerIds.length === 0}
                      onClick={() => onWorkerIdsChange([])}
                    />
                  </li>
                  {visibleWorkers.map((worker) => (
                    <li key={worker.id}>
                      <WorkerRow
                        label={worker.name}
                        checked={workerIds.includes(worker.id)}
                        onClick={() => toggleWorker(worker.id)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section>
            <p className="text-[12px] font-medium text-text-muted">{s.export.formatLabel}</p>
            {formats.length > 1 ? (
              <div role="radiogroup" aria-label={s.export.formatLabel} className="mt-1.5 grid grid-cols-3 gap-2">
                {formats.map(({ format: value, label, icon: Icon }) => {
                  const isActive = value === format;

                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => chooseFormat(value)}
                      className={cn(
                        "flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-[14px] border text-[13px] font-bold",
                        "transition-colors duration-150 active:scale-[0.98]",
                        isActive ? "border-brand bg-brand/10 text-text" : "border-border bg-surface-2 text-text-muted",
                      )}
                    >
                      <Icon className={cn("size-5", isActive && "text-brand")} strokeWidth={2} aria-hidden />
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1.5 text-[13px] font-medium text-text-muted">{s.export.reportsCsvOnly}</p>
            )}
          </section>
        </div>

        <div className="space-y-2 border-t border-border px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => run("download")}
            disabled={busy !== null}
            className={cn(
              "flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-brand",
              "text-[15px] font-bold text-brand-ink transition-transform duration-150 active:scale-[0.98] disabled:opacity-60",
            )}
          >
            {busy === "download" ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <Download className="size-[18px]" strokeWidth={2.2} aria-hidden />
            )}
            {s.export.download}
          </button>

          <button
            type="button"
            onClick={() => run("share")}
            disabled={busy !== null}
            className={cn(
              "flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] border border-border",
              "text-[15px] font-bold text-text transition-transform duration-150 active:scale-[0.98] disabled:opacity-60",
            )}
          >
            {busy === "share" ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <MessageCircle className="size-[18px]" strokeWidth={2.2} aria-hidden />
            )}
            {s.export.sendWhatsapp}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function WorkerRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className="flex h-11 w-full items-center gap-3 rounded-[10px] px-2.5 text-left active:bg-surface"
    >
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2",
          checked ? "border-brand bg-brand" : "border-text-dim",
        )}
      >
        {checked && <Check className="size-3.5 text-brand-ink" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{label}</span>
    </button>
  );
}
