import ExcelJS from "exceljs";

import type { Dict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import { toHours } from "./csv";
import { EXPORT_BRAND, type ExportMeta, type ExportRow } from "./types";

/** Формат даты ячейки по языку: Excel всё равно покажет по региону пользователя, но в файле он задан явно. */
const DATE_FORMATS: Record<Locale, string> = {
  uk: "dd.mm.yyyy",
  nl: "dd-mm-yyyy",
  en: "dd/mm/yyyy",
};

/** `HH:mm` → доля суток: настоящее значение времени, а не текст — с ним работают формулы. */
function timeValue(time: string): number | null {
  const [hours, minutes] = time.split(":").map(Number);

  return Number.isFinite(hours) && Number.isFinite(minutes) ? (hours * 60 + minutes) / 1440 : null;
}

/** `YYYY-MM-DD` → дата без сдвига часового пояса (UTC-полночь — Excel покажет ровно этот день). */
function dateValue(dateKey: string): Date {
  const [year = 1970, month = 1, day = 1] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
const THIN_BORDER: Partial<ExcelJS.Borders> = { bottom: { style: "thin", color: { argb: "FFBBBBBB" } } };

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 30;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.border = THIN_BORDER;
  });
}

/**
 * Excel «Години» — две вкладки:
 *  1. «Години» — одна строка на смену. Настоящие даты и время (не текст), часы десятичными числами
 *     (удобно умножать на ставку), строка заголовков закреплена, автофильтр. Внизу итог через
 *     SUBTOTAL: при фильтре по сотруднику или дате он пересчитывается по видимым строкам.
 *  2. «Підсумок» — по сотруднику: рабочих дней, часы, часы сверх нормы и общий итог. Часы считаются
 *     формулами по первой вкладке, поэтому правка там сразу меняет итоги.
 */
export async function buildXlsx(
  rows: readonly ExportRow[],
  meta: ExportMeta,
  t: Dict,
  locale: Locale,
): Promise<Buffer> {
  const c = t.export.columns;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = EXPORT_BRAND;
  workbook.title = `${EXPORT_BRAND} — ${meta.periodTitle}`;
  workbook.created = new Date();

  // ── Вкладка 1: смены ────────────────────────────────────────────────────────
  const sheet = workbook.addWorksheet(c.sheetHours, {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.columns = [
    { header: c.date, key: "date", width: 12, style: { numFmt: DATE_FORMATS[locale] } },
    { header: c.weekday, key: "weekday", width: 8 },
    { header: c.worker, key: "worker", width: 24 },
    { header: c.site, key: "site", width: 24 },
    { header: c.start, key: "start", width: 9, style: { numFmt: "hh:mm" } },
    { header: c.end, key: "end", width: 9, style: { numFmt: "hh:mm" } },
    { header: c.breakMinutes, key: "breakMinutes", width: 12, style: { numFmt: "0" } },
    { header: c.hours, key: "hours", width: 10, style: { numFmt: "0.00" } },
    { header: c.overtimeHours, key: "overtime", width: 14, style: { numFmt: "0.00" } },
    { header: c.description, key: "description", width: 40, style: { alignment: { wrapText: true, vertical: "top" } } },
  ];

  styleHeader(sheet.getRow(1));

  for (const row of rows) {
    const finished = row.totalMinutes !== null;

    sheet.addRow({
      date: dateValue(row.dateKey),
      weekday: row.weekday,
      worker: row.worker,
      site: row.site,
      start: timeValue(row.start),
      end: finished ? timeValue(row.end) : null,
      breakMinutes: row.breakMinutes,
      hours: finished ? toHours(row.totalMinutes ?? 0) : null,
      overtime: finished ? toHours(row.overtimeMinutes) : null,
      description: row.description,
    });
  }

  const lastDataRow = rows.length + 1;
  const hoursSum = rows.reduce((sum, row) => sum + toHours(row.totalMinutes ?? 0), 0);
  const overtimeSum = rows.reduce((sum, row) => sum + (row.totalMinutes === null ? 0 : toHours(row.overtimeMinutes)), 0);

  const totalRow = sheet.addRow({ date: c.total });
  totalRow.font = { bold: true };
  totalRow.getCell("hours").value = { formula: `SUBTOTAL(109,H2:H${lastDataRow})`, result: hoursSum };
  totalRow.getCell("overtime").value = { formula: `SUBTOTAL(109,I2:I${lastDataRow})`, result: overtimeSum };
  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = { top: { style: "thin", color: { argb: "FF888888" } } };
  });

  if (rows.length > 0) sheet.autoFilter = { from: "A1", to: `J${lastDataRow}` };

  // ── Вкладка 2: итоги по сотрудникам ─────────────────────────────────────────
  const summary = workbook.addWorksheet(c.sheetSummary, { views: [{ state: "frozen", ySplit: 1 }] });

  summary.columns = [
    { header: c.worker, key: "worker", width: 28 },
    { header: c.daysWorked, key: "days", width: 14, style: { numFmt: "0" } },
    { header: c.hours, key: "hours", width: 12, style: { numFmt: "0.00" } },
    { header: c.overtimeHours, key: "overtime", width: 16, style: { numFmt: "0.00" } },
  ];

  styleHeader(summary.getRow(1));

  const people = new Map<string, { days: Set<string>; hours: number; overtime: number }>();

  for (const row of rows) {
    if (row.totalMinutes === null) continue;

    const person = people.get(row.worker) ?? { days: new Set<string>(), hours: 0, overtime: 0 };
    person.days.add(row.dateKey);
    person.hours += toHours(row.totalMinutes);
    person.overtime += toHours(row.overtimeMinutes);
    people.set(row.worker, person);
  }

  const sortedPeople = [...people.entries()].sort(([a], [b]) => a.localeCompare(b, locale));
  const dataSheet = `'${c.sheetHours.replace(/'/g, "''")}'`;

  sortedPeople.forEach(([worker, person], index) => {
    const line = summary.addRow({ worker, days: person.days.size });

    // Часы — формулами по вкладке со сменами: правка там сразу меняет итог.
    line.getCell("hours").value = {
      formula: `SUMIFS(${dataSheet}!$H$2:$H$${lastDataRow},${dataSheet}!$C$2:$C$${lastDataRow},A${index + 2})`,
      result: person.hours,
    };
    line.getCell("overtime").value = {
      formula: `SUMIFS(${dataSheet}!$I$2:$I$${lastDataRow},${dataSheet}!$C$2:$C$${lastDataRow},A${index + 2})`,
      result: person.overtime,
    };
  });

  if (sortedPeople.length > 0) {
    const last = sortedPeople.length + 1;
    const total = summary.addRow({ worker: c.total });
    total.font = { bold: true };
    total.getCell("days").value = { formula: `SUM(B2:B${last})`, result: sortedPeople.reduce((sum, [, p]) => sum + p.days.size, 0) };
    total.getCell("hours").value = { formula: `SUM(C2:C${last})`, result: hoursSum };
    total.getCell("overtime").value = { formula: `SUM(D2:D${last})`, result: overtimeSum };
    total.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { top: { style: "thin", color: { argb: "FF888888" } } };
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
