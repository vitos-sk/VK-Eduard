import ExcelJS from "exceljs";

import type { Dict } from "@/lib/i18n";
import { EXPORT_BRAND, type ExportMeta, type ExportRow } from "./types";

function columns(t: Dict) {
  const c = t.export.columns;

  return [
    { header: c.date, key: "date", width: 12 },
    { header: c.worker, key: "worker", width: 22 },
    { header: c.site, key: "site", width: 22 },
    { header: c.start, key: "start", width: 10 },
    { header: c.end, key: "end", width: 10 },
    { header: c.breakMinutes, key: "breakMinutes", width: 14 },
    { header: c.totalMinutes, key: "total", width: 14 },
    { header: c.workedMinutes, key: "workedMinutes", width: 18 },
    { header: c.overtimeMinutes, key: "overtimeMinutes", width: 16 },
    { header: c.description, key: "description", width: 36 },
    { header: c.photos, key: "photoCount", width: 8 },
  ] as const;
}

/**
 * Excel .xlsx з форматуванням — `docs/ROADMAP.md`, етап 6, доповнений
 * десктоп-адмінкою: бухгалтеру в Європі зручніше відкрити готову таблицю,
 * ніж сирий CSV. Числові колонки лишаються числами (не рядками) — щоб
 * Excel міг рахувати суми, не перетворюючи текст.
 */
export async function buildXlsx(
  rows: readonly ExportRow[],
  meta: ExportMeta,
  t: Dict,
): Promise<Buffer> {
  const COLUMNS = columns(t);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.companyName || EXPORT_BRAND;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(t.export.sheetTitle, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map(({ header, key, width }) => ({ header, key, width }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
  });

  for (const row of rows) {
    sheet.addRow({
      date: row.date,
      worker: row.worker,
      site: row.site,
      start: row.start,
      end: row.end,
      breakMinutes: row.breakMinutes,
      total: row.totalMinutes === null ? t.hours.entryOngoing : row.totalMinutes,
      workedMinutes: row.workedMinutes,
      overtimeMinutes: row.overtimeMinutes,
      description: row.description,
      photoCount: row.photoCount,
    });
  }

  sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + COLUMNS.length)}1` };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
