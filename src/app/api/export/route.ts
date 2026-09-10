import { NextResponse } from "next/server";

import { formatTimeShort, formatWorkDateShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompanyEntryHoursInRange } from "@/modules/entries/queries";
import { getAllSites } from "@/modules/sites/queries";

/** Экранирует поле CSV: кавычки — двойными, оборачивает при спецсимволах. */
function csvField(value: string): string {
  if (/[",\r\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

const HEADER = [
  "Дата",
  "Робітник",
  "Об'єкт",
  "Початок",
  "Кінець",
  "Перерва (хв)",
  "Всього (хв)",
  "Відпрацьовано (хв)",
  "Додатково (хв)",
  "Опис",
  "Фото",
];

/**
 * CSV за диапазон дат для всієї компанії — ROADMAP.md, етап 6.
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

  if (!from || !to) {
    return NextResponse.json(
      { error: "Параметри from і to обов'язкові (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const [rows, sites] = await Promise.all([
    getCompanyEntryHoursInRange(supabase, profile.company_id, from, to),
    getAllSites(supabase),
  ]);

  const siteNameById = new Map(sites.map((site) => [site.id, site.name] as const));

  const lines = [HEADER.map(csvField).join(",")];

  for (const row of rows) {
    if (!row.work_date || !row.started_at) continue;

    const cells = [
      formatWorkDateShort(row.work_date),
      row.full_name ?? "",
      row.site_id ? (siteNameById.get(row.site_id) ?? "") : t.hours.noObject,
      formatTimeShort(row.started_at),
      row.ended_at ? formatTimeShort(row.ended_at) : t.hours.entryOngoing,
      String(row.break_minutes ?? 0),
      row.total_minutes === null ? t.hours.entryOngoing : String(row.total_minutes),
      String(row.worked_minutes ?? 0),
      String(row.overtime_minutes ?? 0),
      row.description ?? "",
      String(row.photo_count ?? 0),
    ];

    lines.push(cells.map(csvField).join(","));
  }

  // BOM в начале — иначе Excel показывает кириллицу кракозябрами.
  const csv = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hours_${from}_${to}.csv"`,
    },
  });
}
