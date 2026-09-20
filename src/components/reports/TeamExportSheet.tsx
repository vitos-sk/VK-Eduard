"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Download, Loader2, MessageCircle } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckMark } from "@/components/ui/checkbox";
import { SearchField } from "@/components/shared/SearchField";

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
        className={cn(
          "mx-auto max-w-[430px] border-t border-border bg-surface text-text data-[vaul-drawer-direction=bottom]:max-h-[88dvh]",
          // Таб-бар (z-60) лежить над листом: лишаємо під нього місце, як у листі «+».
          "pb-[calc(88px+env(safe-area-inset-bottom))] phone:pb-[calc(88px+1.5rem)] lg:pb-0",
        )}
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
            <Button
              variant="field"
              size="field"
              className="mt-1.5 h-12 gap-2 px-3"
              onClick={() => setIsWorkersOpen((current) => !current)}
              aria-expanded={isWorkersOpen}
            >
              <span className="min-w-0 flex-1 truncate text-left text-[15px] font-bold">{scopeLabel}</span>
              <ChevronDown
                className={cn("size-5 shrink-0 text-text-muted transition-transform duration-150", isWorkersOpen && "rotate-180")}
                strokeWidth={2.2}
                aria-hidden
              />
            </Button>

            {isWorkersOpen && (
              <Card tone="muted" padding="none" className="mt-2 rounded-ctl p-1.5">
                {workers.length > SEARCH_THRESHOLD && (
                  <SearchField
                    compact
                    className="mb-1"
                    value={search}
                    onChange={setSearch}
                    placeholder={s.export.searchPlaceholder}
                  />
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
              </Card>
            )}
          </section>

          <section>
            <p className="text-[12px] font-medium text-text-muted">{s.export.formatLabel}</p>
            {formats.length > 1 ? (
              <div role="radiogroup" aria-label={s.export.formatLabel} className="mt-1.5 grid grid-cols-3 gap-2">
                {formats.map(({ format: value, label, icon: Icon }) => {
                  const isActive = value === format;

                  return (
                    <Card
                      key={value}
                      asChild
                      tone="muted"
                      padding="none"
                      interactive
                      selected={isActive}
                      className={cn(
                        "flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-ctl text-center text-[13px] font-bold",
                        isActive ? "text-text" : "text-text-muted",
                      )}
                    >
                      <button type="button" role="radio" aria-checked={isActive} onClick={() => chooseFormat(value)}>
                        <Icon className={cn("size-5", isActive && "text-primary")} strokeWidth={2} aria-hidden />
                        {label}
                      </button>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1.5 text-[13px] font-medium text-text-muted">{s.export.reportsCsvOnly}</p>
            )}
          </section>
        </div>

        <div className="space-y-2 border-t border-border px-4 pt-3 pb-3 lg:pb-4">
          <Button block onClick={() => run("download")} disabled={busy !== null}>
            {busy === "download" ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <Download className="size-[18px]" strokeWidth={2.2} aria-hidden />
            )}
            {s.export.download}
          </Button>

          <Button variant="outline" block onClick={() => run("share")} disabled={busy !== null}>
            {busy === "share" ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <MessageCircle className="size-[18px]" strokeWidth={2.2} aria-hidden />
            )}
            {s.export.sendWhatsapp}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function WorkerRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="md"
      block
      className="justify-start gap-3 rounded-md px-2.5 hover:bg-surface"
      onClick={onClick}
      aria-pressed={checked}
    >
      <CheckMark checked={checked} />
      <span className="min-w-0 flex-1 truncate text-left text-[14px] font-semibold">{label}</span>
    </Button>
  );
}
