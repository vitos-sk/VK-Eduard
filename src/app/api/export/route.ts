import { NextResponse } from "next/server";

import { formatDateShort, formatTimeShort, formatWorkDateShort, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompanyEntryHoursInRange } from "@/modules/entries/queries";
import { buildCsv } from "@/modules/export/csv";
import { buildPdf } from "@/modules/export/pdf";
import type { ExportRow } from "@/modules/export/types";
import { buildXlsx } from "@/modules/export/xlsx";
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
 * Експорт годин за діапазон дат — CSV (як і раніше), Excel .xlsx і
 * PDF-табель (`docs/ROADMAP.md`, етап 6, доповнений десктоп-адмінкою).
 * Формат — `?format=`, дефолт `csv` для сумісності зі старими посиланнями.
 * `?workerId=` звужує вибірку до одного робітника (експорт з картки
 * робітника в адмінці) — фільтр застосовується вже після RLS-вибірки.
 *
 * RLS на `entry_hours` сама вирішує обсяг: рядовому робітнику віддасть
 * тільки його зміни, шефу (`is_boss()`) — усі по компанії. Кнопка в
 * інтерфейсі показана тільки шефу, але навіть пряме звернення сюди
 * не дає рядовому чужих даних — розмежування вже на рівні бази.
 */
export async function GET(request: Request) {
  const profile = await requireProfile();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const workerId = searchParams.get("workerId");
  const formatParam = searchParams.get("format") ?? "csv";

  if (!from || !to) {
    return NextResponse.json(
      { error: "Параметри from і to обов'язкові (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  if (!isExportFormat(formatParam)) {
    return NextResponse.json({ error: "Невідомий формат експорту" }, { status: 400 });
  }

  const supabase = await createClient();

  const [entryHours, sites, company] = await Promise.all([
    getCompanyEntryHoursInRange(supabase, profile.company_id, from, to),
    getAllSites(supabase),
    supabase.from("companies").select("name").eq("id", profile.company_id).maybeSingle(),
  ]);

  const siteNameById = new Map(sites.map((site) => [site.id, site.name] as const));

  const rows: ExportRow[] = entryHours
    .filter((row) => row.work_date && row.started_at)
    .filter((row) => !workerId || row.author_id === workerId)
    .map((row) => ({
      date: formatWorkDateShort(row.work_date!),
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
    companyName: company.data?.name ?? "",
    periodTitle: `${formatDateShort(fromDateKey(from))} – ${formatDateShort(fromDateKey(to))}`,
  };

  const fileName = `hours_${from}_${to}.${formatParam}`;
  const body = await buildExportBody(formatParam, rows, meta);

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
): Promise<BodyInit> {
  if (format === "xlsx") return new Uint8Array(await buildXlsx(rows, meta));
  if (format === "pdf") return new Uint8Array(await buildPdf(rows, meta));
  return buildCsv(rows);
}
