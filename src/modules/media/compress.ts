/**
 * Сжатие фото в браузере: до ~1600px по длинной стороне, WebP q=0.8.
 * Снимок с телефона 3–6 МБ превращается в 200–400 КБ — REPORTS.md, раздел 7.
 * Делается **до** попадания в очередь загрузки, а не после.
 *
 * Только браузер: `createImageBitmap`/`canvas` серверу недоступны и не нужны —
 * загрузка фото всегда идёт с клиента (см. `modules/media/photos.ts`).
 */

const MAX_DIMENSION = 1600;
const QUALITY = 0.8;

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * `imageOrientation: "from-image"` — вот и весь EXIF-поворот: браузер сам
 * поворачивает пиксели по EXIF-тегу при декодировании, дальше это обычная
 * картинка без вращения. Ручной разбор EXIF не нужен.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D недоступний у цьому браузері");
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );

    if (!blob) {
      throw new Error("Не вдалося стиснути зображення");
    }

    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}
