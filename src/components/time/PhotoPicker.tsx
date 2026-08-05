"use client";

import { Camera, ImageIcon, X } from "lucide-react";

import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PhotoPickerProps {
  /** Идентификаторы плейсхолдеров — реальных файлов в UI-фазе нет. */
  photos: readonly string[];
  max: number;
  onAdd: () => void;
  onRemove: (id: string) => void;
  className?: string;
}

/**
 * Блок «Додати фото»: кнопка со счётчиком и сетка квадратов-плейсхолдеров.
 * Загрузки файлов нет — нажатие просто добавляет пустой квадрат.
 */
export function PhotoPicker({
  photos,
  max,
  onAdd,
  onRemove,
  className,
}: PhotoPickerProps) {
  const isFull = photos.length >= max;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onAdd}
        disabled={isFull}
        className={cn(
          "flex h-[72px] w-full items-center justify-center gap-2 rounded-[16px]",
          "border border-dashed border-border bg-surface text-[15px] font-bold text-text",
          "transition-transform duration-150 active:scale-[0.98]",
          "disabled:pointer-events-none disabled:opacity-40",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        )}
      >
        <Camera className="size-5 text-brand" strokeWidth={2} aria-hidden />
        {t.manualTime.photos}
        <span className="tabular text-[13px] font-semibold text-text-muted">
          {fmt(t.manualTime.photosCounter, { n: photos.length, max })}
        </span>
      </button>

      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((id) => (
            <li key={id} className="relative">
              <div
                aria-hidden
                className="flex aspect-square items-center justify-center rounded-[12px] border border-border bg-surface-2"
              >
                <ImageIcon
                  className="size-6 text-text-dim"
                  strokeWidth={2}
                />
              </div>

              <button
                type="button"
                onClick={() => onRemove(id)}
                aria-label={t.manualTime.removePhoto}
                className={cn(
                  "absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full",
                  "border border-border bg-surface text-text",
                  // Область нажатия шире самой кнопки — пальцу в перчатке
                  "after:absolute after:-inset-2 after:content-['']",
                  "transition-transform duration-150 active:scale-95",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                )}
              >
                <X className="size-4" strokeWidth={2.6} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
