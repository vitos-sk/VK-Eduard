import { NextResponse } from "next/server";

import { formatDateShort, formatTimeShort, formatWorkDateShort, fromDateKey } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompanyEntryHoursInRange } from "@/modules/entries/queries";
import { buildCsv } from "@/modules/export/csv";
import { buildPdf } from "@/modules/export/pdf";
import { buildReportsCsv } from "@/modules/export/reportsCsv";
import {
  EXPORT_BRAND,
  EXPORT_FILE_PREFIX,
  type ExportRow,
  type ReportExportRow,
} from "@/modules/export/types";
import { buildXlsx } from "@/modules/export/xlsx";
import { getCompanyReportsInRange } from "@/modules/reports/queries";
import { getAllSites } from "@/modules/sites/queries";

// exceljs/pdfkit читають файли й працюють з Buffer — потребують Node,
// не Edge Runtime.
export const runtime = "nodejs";

const CONTENT_TYPES = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;

type ExportFormat = keyof typeof CONTENT_TYPES;

function isExportFormat(value: string): value is ExportFormat {
  return value in CONTENT_TYPES;
}

/**
 * Експорт годин (`kind=hours`, за замовч.) або звітів (`kind=reports`) за
 * діапазон дат. Години — CSV/Excel .xlsx/PDF-табель (`docs/ROADMAP.md`,
 * етап 6, доповнений десктоп-адмінкою). Звіти — тільки CSV
 * (дата/робітник/об'єкт/категорії/опис/фото, без часу).
 * Формат — `?format=`, дефолт `csv` для сумісності зі старими посиланнями.
 * `?workerId=` звужує вибірку до одного робітника (експорт з картки
 * робітника в «Команді»); `?workerIds=id1,id2` — до списку (мультивибір
 * чекбоксами у «Звіти → Команда») — обидва фільтри застосовуються
 * вже після RLS-вибірки, `workerIds` має пріоритет, якщо задані обидва.
 *
 * RLS на `entry_hours`/`site_reports` сама вирішує обсяг: рядовому
 * робітнику віддасть тільки його дані, шефу (`is_boss()`) — усі по
 * компанії. Кнопка в інтерфейсі показана тільки шефу, але навіть пряме
 * звернення сюди не дає рядовому чужих даних — розмежування вже на
 * рівні бази.
 */
export async function GET(request: Request) {
  const t = await getT();
  const profile = await requireProfile();
  const locale = await getLocale();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const workerId = searchParams.get("workerId");
  const workerIdsParam = searchParams.get("workerIds");
  const workerIdSet = workerIdsParam
    ? new Set(workerIdsParam.split(",").filter(Boolean))
    : workerId
      ? new Set([workerId])
      : null;
  const formatParam = searchParams.get("format") ?? "csv";
  const kind = searchParams.get("kind") === "reports" ? "reports" : "hours";

  if (!from || !to) {
    return NextResponse.json(
      { error: "Параметри from і to обов'язкові (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  if (!isExportFormat(formatParam)) {
    return NextResponse.json({ error: "Невідомий формат експорту" }, { status: 400 });
  }

  if (kind === "reports" && formatParam !== "csv") {
    return NextResponse.json({ error: "Для звітів підтримується тільки CSV" }, { status: 400 });
  }

  const supabase = await createClient();

  if (kind === "reports") {
    const [reports, sites] = await Promise.all([
      getCompanyReportsInRange(supabase, profile.company_id, from, to, t),
      getAllSites(supabase),
    ]);

    const siteNameById = new Map(sites.map((site) => [site.id, site.name] as const));

    const rows: ReportExportRow[] = reports
      .filter((report) => !workerIdSet || workerIdSet.has(report.author_id))
      .map((report) => ({
        date: formatWorkDateShort(report.work_date, locale),
        worker: report.author_full_name,
        site: report.site_id ? (siteNameById.get(report.site_id) ?? "") : t.hours.noObject,
        categories: report.category_labels.join("; "),
        description: report.description,
        photoCount: report.photo_count,
      }));

    const fileName = `${EXPORT_FILE_PREFIX}_reports_${from}_${to}.csv`;

    return new NextResponse(buildReportsCsv(rows, t), {
      headers: {
        "Content-Type": CONTENT_TYPES.csv,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  const [entryHours, sites] = await Promise.all([
    getCompanyEntryHoursInRange(supabase, profile.company_id, from, to),
    getAllSites(supabase),
  ]);

  const siteNameById = new Map(sites.map((site) => [site.id, site.name] as const));

  const rows: ExportRow[] = entryHours
    .filter((row) => row.work_date && row.started_at)
    .filter((row) => !workerIdSet || workerIdSet.has(row.author_id!))
    .map((row) => ({
      date: formatWorkDateShort(row.work_date!, locale),
      worker: row.full_name ?? "",
      site: row.site_id ? (siteNameById.get(row.site_id) ?? "") : t.hours.noObject,
      start: formatTimeShort(row.started_at!),
      end: row.ended_at ? formatTimeShort(row.ended_at) : t.hours.entryOngoing,
      breakMinutes: row.break_minutes ?? 0,
      totalMinutes: row.total_minutes,
      workedMinutes: row.worked_minutes ?? 0,
      overtimeMinutes: row.overtime_minutes ?? 0,
      description: row.description ?? "",
      photoCount: row.photo_count ?? 0,
    }));

  const meta = {
    companyName: EXPORT_BRAND,
    periodTitle: `${formatDateShort(fromDateKey(from), locale)} – ${formatDateShort(fromDateKey(to), locale)}`,
  };

  const fileName = `${EXPORT_FILE_PREFIX}_hours_${from}_${to}.${formatParam}`;
  const body = await buildExportBody(formatParam, rows, meta, t);

  return new NextResponse(body, {
    headers: {
      "Content-Type": CONTENT_TYPES[formatParam],
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

async function buildExportBody(
  format: ExportFormat,
  rows: readonly ExportRow[],
  meta: { companyName: string; periodTitle: string },
  t: Dict,
): Promise<BodyInit> {
  if (format === "xlsx") return new Uint8Array(await buildXlsx(rows, meta, t));
  if (format === "pdf") return new Uint8Array(await buildPdf(rows, meta, t));
  return buildCsv(rows, t);
}
