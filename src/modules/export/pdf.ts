import { readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";

import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { ExportMeta, ExportRow } from "./types";

/**
 * PT Sans замість штатних шрифтів pdfkit (Helvetica та інші): вони не мають
 * кирилічних гліфів, українські підписи вийшли б порожніми прямокутниками.
 * Статичні `.ttf` лежать у репозиторії (`assets/fonts`) — Manrope з сайту
 * доступний лише як variable font, pdfkit з такими працює ненадійно.
 */
const FONTS_DIR = join(process.cwd(), "assets", "fonts");
const REGULAR_FONT = readFileSync(join(FONTS_DIR, "PTSans-Regular.ttf"));
const BOLD_FONT = readFileSync(join(FONTS_DIR, "PTSans-Bold.ttf"));

const PAGE_MARGIN = 36;

const COLUMNS = [
  { key: "date", header: "Дата", width: 55 },
  { key: "worker", header: "Робітник", width: 110 },
  { key: "site", header: "Об'єкт", width: 105 },
  { key: "time", header: "Час", width: 85 },
  { key: "worked", header: "Відпрацьовано", width: 75 },
  { key: "overtime", header: "Додатково", width: 65 },
  { key: "description", header: "Опис", width: 175 },
] as const;

const TABLE_WIDTH = COLUMNS.reduce((sum, column) => sum + column.width, 0);
const ROW_HEIGHT = 20;

/**
 * PDF-табель за період — альбомна A4, компанія і період у шапці, підсумок
 * годин унизу. На відміну від CSV/Excel (сирі рядки бази) розрахований на
 * друк чи відправку бухгалтеру як є, без подальшої обробки.
 */
export async function buildPdf(
  rows: readonly ExportRow[],
  meta: ExportMeta,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: PAGE_MARGIN,
    bufferPages: true,
  });

  doc.registerFont("PTSans", REGULAR_FONT);
  doc.registerFont("PTSans-Bold", BOLD_FONT);
  doc.font("PTSans");

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawHeader(doc, meta);
  let y = drawTableHeader(doc, doc.y + 12);

  const totalWorkedMinutes = rows.reduce((sum, row) => sum + row.workedMinutes, 0);

  for (const row of rows) {
    if (y + ROW_HEIGHT > doc.page.height - PAGE_MARGIN - 40) {
      doc.addPage();
      y = drawTableHeader(doc, PAGE_MARGIN);
    }

    y = drawRow(doc, y, row);
  }

  doc
    .font("PTSans-Bold")
    .fontSize(10)
    .text(
      `${t.admin.dashboard.monthHours}: ${formatHoursShort(totalWorkedMinutes)}`,
      PAGE_MARGIN,
      y + 10,
    );

  doc.end();
  return done;
}

function drawHeader(doc: PDFKit.PDFDocument, meta: ExportMeta) {
  doc
    .font("PTSans-Bold")
    .fontSize(16)
    .text(meta.companyName || "K work", PAGE_MARGIN, PAGE_MARGIN);

  doc
    .font("PTSans")
    .fontSize(11)
    .fillColor("#555555")
    .text(meta.periodTitle, PAGE_MARGIN, doc.y + 2)
    .fillColor("#000000");
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number): number {
  doc.font("PTSans-Bold").fontSize(9);

  let x = PAGE_MARGIN;
  for (const column of COLUMNS) {
    doc.text(column.header, x, y, { width: column.width - 6 });
    x += column.width;
  }

  doc
    .moveTo(PAGE_MARGIN, y + 14)
    .lineTo(PAGE_MARGIN + TABLE_WIDTH, y + 14)
    .strokeColor("#cccccc")
    .stroke();

  return y + 20;
}

function drawRow(doc: PDFKit.PDFDocument, y: number, row: ExportRow): number {
  doc.font("PTSans").fontSize(9);

  const cells: Record<(typeof COLUMNS)[number]["key"], string> = {
    date: row.date,
    worker: row.worker,
    site: row.site,
    time: `${row.start}–${row.end}`,
    worked: formatHoursShort(row.workedMinutes),
    overtime: row.overtimeMinutes > 0 ? formatHoursShort(row.overtimeMinutes) : "",
    description: row.description,
  };

  let x = PAGE_MARGIN;
  for (const column of COLUMNS) {
    doc.text(cells[column.key], x, y, { width: column.width - 6, height: ROW_HEIGHT });
    x += column.width;
  }

  return y + ROW_HEIGHT;
}
