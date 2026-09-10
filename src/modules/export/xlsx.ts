import ExcelJS from "exceljs";

import { t } from "@/lib/i18n";
import type { ExportMeta, ExportRow } from "./types";

const COLUMNS = [
  { header: "Дата", key: "date", width: 12 },
  { header: "Робітник", key: "worker", width: 22 },
  { header: "Об'єкт", key: "site", width: 22 },
  { header: "Початок", key: "start", width: 10 },
  { header: "Кінець", key: "end", width: 10 },
  { header: "Перерва (хв)", key: "breakMinutes", width: 14 },
  { header: "Всього (хв)", key: "total", width: 14 },
  { header: "Відпрацьовано (хв)", key: "workedMinutes", width: 18 },
  { header: "Додатково (хв)", key: "overtimeMinutes", width: 16 },
  { header: "Опис", key: "description", width: 36 },
  { header: "Фото", key: "photoCount", width: 8 },
] as const;

/**
 * Excel .xlsx з форматуванням — `docs/ROADMAP.md`, етап 6, доповнений
 * десктоп-адмінкою: бухгалтеру в Європі зручніше відкрити готову таблицю,
 * ніж сирий CSV. Числові колонки лишаються числами (не рядками) — щоб
 * Excel міг рахувати суми, не перетворюючи текст.
 */
export async function buildXlsx(
  rows: readonly ExportRow[],
  meta: ExportMeta,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.companyName || "K work";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(t.admin.reports.title, {
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
