"use client";

import { useId } from "react";
import { Building2, ChevronsUpDown } from "lucide-react";

import { FieldLabel } from "@/components/shared/FormParts";
import { Thumb } from "@/components/shared/Thumb";
import { sceneForId } from "@/lib/siteScene";
import { cn } from "@/lib/utils";
import type { Site } from "@/modules/sites/queries";

interface ObjectFieldProps {
  label: string;
  /** Выбранный объект; `null`, пока не выбран. */
  site: Site | null;
  placeholder: string;
  /** Подписанная ссылка на фото выбранного объекта (нет фото — сцена-заглушка). */
  photoUrl?: string | null;
  onClick: () => void;
  className?: string;
}

/**
 * Поле «Об'єкт» в формах: выглядит как поле выбора — рамка, название слева, фото объекта справа и стрелки
 * «вверх-вниз». Пустое поле зовёт нажать: пунктирная плитка с домиком и серая подсказка. Нажатие открывает
 * `ObjectPickerDrawer`.
 */
export function ObjectField({ label, site, placeholder, photoUrl, onClick, className }: ObjectFieldProps) {
  const labelId = useId();

  return (
    <div className={className}>
      <FieldLabel id={labelId}>{label}</FieldLabel>

      <button
        type="button"
        aria-labelledby={labelId}
        aria-haspopup="dialog"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-ctl border border-border-strong bg-field p-2 pl-3.5 text-left",
          "transition-colors outline-none hover:border-text-dim hover:bg-primary-tint",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <span className="min-w-0 flex-1">
          {site ? (
            <>
              <span className="block truncate text-[15px] font-semibold">{site.name}</span>
              {site.address && <span className="block truncate text-[12px] text-ink-2">{site.address}</span>}
            </>
          ) : (
            <span className="block truncate text-[15px] font-medium text-text-dim">{placeholder}</span>
          )}
        </span>

        {site ? (
          <Thumb scene={sceneForId(site.id)} photoUrl={photoUrl ?? null} size="sm" />
        ) : (
          <span
            aria-hidden
            className="grid size-[44px] shrink-0 place-items-center rounded-md border border-dashed border-perf bg-stub text-ink-2"
          >
            <Building2 className="size-5" strokeWidth={1.9} />
          </span>
        )}

        <ChevronsUpDown className="size-4 shrink-0 text-ink-2" strokeWidth={1.9} aria-hidden />
      </button>
    </div>
  );
}
