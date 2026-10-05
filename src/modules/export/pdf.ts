import { readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";

import { tokens } from "@/design-system/tokens";
import { formatHoursShort } from "@/lib/format";
import type { Dict } from "@/lib/i18n";
import { EXPORT_BRAND, type ExportMeta, type ExportRow } from "./types";

/**
 * Golos Text (текст) і JetBrains Mono (години, дати, час) замість штатних шрифтів
 * pdfkit (Helvetica та інші): вони не мають кирилічних гліфів, українські підписи
 * вийшли б порожніми прямокутниками. Статичні `.ttf` (ліцензія OFL) лежать
 * у репозиторії (`assets/fonts`): Golos Text у Google Fonts лише variable font,
 * з яким pdfkit працює ненадійно, тому ваги 400 і 600 нарізані з нього окремо.
 */
const FONTS_DIR = join(process.cwd(), "assets", "fonts");
const FONT_TEXT = "GolosText";
const FONT_TEXT_BOLD = "GolosText-SemiBold";
const FONT_MONO = "JetBrainsMono";
const FONT_MONO_BOLD = "JetBrainsMono-SemiBold";
const REGULAR_FONT = readFileSync(join(FONTS_DIR, "GolosText-Regular.ttf"));
const BOLD_FONT = readFileSync(join(FONTS_DIR, "GolosText-SemiBold.ttf"));
const MONO_FONT = readFileSync(join(FONTS_DIR, "JetBrainsMono-Medium.ttf"));
const MONO_BOLD_FONT = readFileSync(join(FONTS_DIR, "JetBrainsMono-SemiBold.ttf"));

const PAGE_MARGIN = 36;

const COLUMNS = [
  { key: "date", width: 55 },
  { key: "worker", width: 110 },
  { key: "site", width: 105 },
  { key: "time", width: 85 },
  { key: "worked", width: 75 },
  { key: "overtime", width: 65 },
  { key: "description", width: 175 },
] as const;

const TABLE_WIDTH = COLUMNS.reduce((sum, column) => sum + column.width, 0);
const ROW_HEIGHT = 20;
/** Колонки з числами — моноширинним шрифтом, щоб години стояли стовпчиком. */
const MONO_COLUMNS = new Set<string>(["date", "time", "worked", "overtime"]);

/**
 * PDF-табель за період — альбомна A4, компанія і період у шапці, підсумок
 * годин унизу. На відміну від CSV/Excel (сирі рядки бази) розрахований на
 * друк чи відправку бухгалтеру як є, без подальшої обробки.
 */
export async function buildPdf(
  rows: readonly ExportRow[],
  meta: ExportMeta,
  t: Dict,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: PAGE_MARGIN,
    bufferPages: true,
  });

  doc.registerFont(FONT_TEXT, REGULAR_FONT);
  doc.registerFont(FONT_TEXT_BOLD, BOLD_FONT);
  doc.registerFont(FONT_MONO, MONO_FONT);
  doc.registerFont(FONT_MONO_BOLD, MONO_BOLD_FONT);
  doc.font(FONT_TEXT);

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawHeader(doc, meta);
  let y = drawTableHeader(doc, doc.y + 12, t);

  const totalWorkedMinutes = rows.reduce((sum, row) => sum + row.workedMinutes, 0);

  for (const row of rows) {
    if (y + ROW_HEIGHT > doc.page.height - PAGE_MARGIN - 40) {
      doc.addPage();
      y = drawTableHeader(doc, PAGE_MARGIN, t);
    }

    y = drawRow(doc, y, row);
  }

  doc
    .font(FONT_TEXT_BOLD)
    .fontSize(10)
    .text(`${t.export.monthHours}: `, PAGE_MARGIN, y + 10, { continued: true })
    .font(FONT_MONO_BOLD)
    .text(formatHoursShort(totalWorkedMinutes));

  doc.end();
  return done;
}

function drawHeader(doc: PDFKit.PDFDocument, meta: ExportMeta) {
  doc
    .font(FONT_TEXT_BOLD)
    .fontSize(16)
    .text(meta.companyName || EXPORT_BRAND, PAGE_MARGIN, PAGE_MARGIN);

  doc
    .font(FONT_TEXT)
    .fontSize(11)
    .fillColor(tokens.ink2)
    .text(meta.periodTitle, PAGE_MARGIN, doc.y + 2)
    .fillColor(tokens.ink);
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number, t: Dict): number {
  doc.font(FONT_TEXT_BOLD).fontSize(9);

  let x = PAGE_MARGIN;
  for (const column of COLUMNS) {
    doc.text(t.export.columns[column.key], x, y, { width: column.width - 6 });
    x += column.width;
  }

  doc
    .moveTo(PAGE_MARGIN, y + 14)
    .lineTo(PAGE_MARGIN + TABLE_WIDTH, y + 14)
    .strokeColor(tokens.edge)
    .stroke();

  return y + 20;
}

function drawRow(doc: PDFKit.PDFDocument, y: number, row: ExportRow): number {
  doc.font(FONT_TEXT).fontSize(9);

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
    doc
      .font(MONO_COLUMNS.has(column.key) ? FONT_MONO : FONT_TEXT)
      .fontSize(9)
      .text(cells[column.key], x, y, { width: column.width - 6, height: ROW_HEIGHT });
    x += column.width;
  }

  return y + ROW_HEIGHT;
}
