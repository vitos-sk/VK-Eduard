import Link from "next/link";
import { Camera, ChevronRight, FileText } from "lucide-react";

import { MetaRow } from "@/components/shared/MetaRow";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Thumb } from "@/components/shared/Thumb";
import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { SiteObject } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ObjectCardProps {
  object: SiteObject;
  /** Стрелка «›» справа — для списка на экране «Об'єкти». */
  showChevron?: boolean;
  className?: string;
}

/** Карточка стройплощадки: миниатюра, название, адрес, мета-строка и статус. */
export function ObjectCard({
  object,
  showChevron = false,
  className,
}: ObjectCardProps) {
  return (
    <Link
      href={`/objects/${object.id}`}
      className={cn(
        "flex w-full items-center gap-3 rounded-[16px] border border-border bg-surface p-4 text-left",
        "transition-transform duration-150 active:scale-[0.98]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        object.archivedAt && "opacity-60",
        className,
      )}
    >
      <Thumb name={object.name} gradient={object.gradient} size="md" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold">{object.name}</p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-text-muted">
          {object.address || t.common.dash}
        </p>

        {/* Статус — в нижней строке: рядом с названием бейдж не оставляет
            ему читаемой ширины на 390px. Если не влезает и здесь —
            переносится на свою строку, ничего не обрезая. */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <MetaRow
            className="shrink-0"
            items={[
              {
                icon: Camera,
                label: fmt(t.objects.photosCount, { n: object.photosCount }),
              },
              {
                icon: FileText,
                label: fmt(t.objects.reportsCount, { n: object.reportsCount }),
              },
            ]}
          />
          {object.archivedAt ? (
            <span className="inline-flex shrink-0 items-center rounded-[8px] bg-surface-2 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-text-dim uppercase whitespace-nowrap">
              {t.objects.archivedBadge}
            </span>
          ) : (
            <StatusBadge status={object.status} />
          )}
        </div>
      </div>

      {showChevron && (
        <ChevronRight
          className="size-5 shrink-0 text-text-dim"
          strokeWidth={2.4}
          aria-hidden
        />
      )}
    </Link>
  );
}
