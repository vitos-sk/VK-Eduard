import { toast } from "sonner";

import { reportsStrings as s } from "@/lib/i18n/parts/reports";
import { buildExportUrl, type ExportFormat, type ExportKind } from "@/modules/export/formats";

interface ShareExportParams {
  from: string;
  to: string;
  format: ExportFormat;
  kind: ExportKind;
  workerIds?: readonly string[];
}

function extractFileName(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename="([^"]+)"/.exec(disposition);
  return match?.[1] ?? fallback;
}

/**
 * Скачує файл і відкриває `wa.me` з підказкою прикріпити його вручну — фолбек,
 * коли файловий Web Share недоступний або `navigator.share()` впав (після
 * мережевого запиту user-activation могла згаснути). Файл на диску гарантований.
 */
function downloadAndOpenWhatsApp(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

  window.open(`https://wa.me/?text=${encodeURIComponent(s.whatsapp.fallbackText)}`, "_blank");
}

/**
 * Готує той самий файл, що й «Завантажити», і віддає його в системне меню
 * «Поділитися» (Android Chrome, iOS Safari 15+); на десктопі — скачування + `wa.me`.
 */
export async function shareExportFile({ from, to, format, kind, workerIds }: ShareExportParams): Promise<boolean> {
  try {
    const response = await fetch(buildExportUrl({ from, to, format, kind, workerIds }));
    if (!response.ok) throw new Error("export failed");

    const blob = await response.blob();
    const fileName = extractFileName(response.headers.get("Content-Disposition"), `export.${format}`);
    const file = new File([blob], fileName, { type: blob.type });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return false;
        downloadAndOpenWhatsApp(blob, fileName);
      }
      return true;
    }

    downloadAndOpenWhatsApp(blob, fileName);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return false;
    toast(s.whatsapp.error);
    return false;
  }
}

/** Скачує файл прямо з `/api/export` (з індикатором у листі й тостом про помилку). */
export async function downloadExportFile({
  from,
  to,
  format,
  kind,
  workerIds,
}: ShareExportParams): Promise<boolean> {
  try {
    const response = await fetch(buildExportUrl({ from, to, format, kind, workerIds }));
    if (!response.ok) throw new Error("export failed");

    const blob = await response.blob();
    const fileName = extractFileName(response.headers.get("Content-Disposition"), `export.${format}`);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    return true;
  } catch {
    toast(s.export.error);
    return false;
  }
}
